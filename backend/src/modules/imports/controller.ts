import type { Request, Response } from "express";
import ExcelJS from "exceljs";
import { MaintenancePriority } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { assertServiceAccess, clientScopeFilter, resolveClientId } from "../../middleware/rbac";
import { writeAuditLog } from "../../utils/audit";
import { applySparePartMovement } from "../../lib/inventory";
import { assertInstrumentLimitNotExceeded } from "../../lib/planLimits";
import { ABAS, gerarPlanilhaModelo } from "./template";

/**
 * Importacao por planilha.
 *
 * A regra que organiza tudo aqui: **confere o arquivo inteiro antes de gravar qualquer
 * coisa**. Uma importacao que grava metade e para no erro da linha 80 deixa a base num
 * estado que ninguem sabe desfazer - o cliente teria que descobrir a mao o que entrou.
 * Por isso a leitura acontece duas vezes: uma para validar e mostrar o resultado, outra
 * (so depois da confirmacao) para gravar.
 */

export const baixarModelo = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const { clientId } = req.query as { clientId?: string };
  const alvo = clientId ?? clientScopeFilter(req).clientId;

  let nome: string | undefined;
  if (alvo) {
    const cliente = await prisma.client.findFirst({ where: { id: alvo }, select: { companyName: true } });
    nome = cliente?.companyName;
  }

  const arquivo = await gerarPlanilhaModelo(nome);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", 'attachment; filename="modelo-importacao-cmms.xlsx"');
  res.end(arquivo);
});

// ---------------------------------------------------------------------------
// Leitura da planilha
// ---------------------------------------------------------------------------

type Linha = { numero: number; valores: Record<string, string> };
type Problema = { aba: string; linha: number; mensagem: string };

function texto(valor: ExcelJS.CellValue): string {
  if (valor == null) return "";
  if (typeof valor === "object") {
    // Celula com formula ou rich text: interessa o resultado, nao a formula.
    if ("result" in valor && valor.result != null) return String(valor.result).trim();
    if ("richText" in valor && Array.isArray(valor.richText)) return valor.richText.map((p) => p.text).join("").trim();
    if ("text" in valor && typeof valor.text === "string") return valor.text.trim();
    return "";
  }
  return String(valor).trim();
}

/** Le uma aba, casando as colunas pelo titulo do cabecalho (nao pela posicao): quem
 * reordena colunas no Excel nao deveria quebrar a importacao. */
function lerAba(wb: ExcelJS.Workbook, nomeDaAba: string): Linha[] {
  const definicao = ABAS.find((a) => a.nome === nomeDaAba)!;
  const ws = wb.getWorksheet(nomeDaAba);
  if (!ws) return [];

  const cabecalho = ws.getRow(1);
  const posicaoDaChave = new Map<number, string>();
  cabecalho.eachCell((celula, coluna) => {
    const titulo = texto(celula.value).replace(/\*/g, "").trim().toLowerCase();
    const def = definicao.colunas.find((c) => c.titulo.replace(/\*/g, "").trim().toLowerCase() === titulo);
    if (def) posicaoDaKey(posicaoDaChave, coluna, def.chave);
  });

  const linhas: Linha[] = [];
  ws.eachRow((row, numero) => {
    if (numero === 1) return;
    const valores: Record<string, string> = {};
    for (const [coluna, chave] of posicaoDaChave) valores[chave] = texto(row.getCell(coluna).value);
    // Linha totalmente vazia e' separador visual, nao dado.
    if (Object.values(valores).every((v) => !v)) return;
    linhas.push({ numero, valores });
  });
  return linhas;
}

function posicaoDaKey(mapa: Map<number, string>, coluna: number, chave: string) {
  mapa.set(coluna, chave);
}

function simNao(valor: string): boolean {
  return ["sim", "s", "true", "1", "x"].includes(valor.trim().toLowerCase());
}

function numero(valor: string): number | null {
  if (!valor) return null;
  const limpo = valor.replace(/\s/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", ".");
  const n = Number(limpo);
  return Number.isFinite(n) ? n : null;
}

const CRITICIDADES: Record<string, MaintenancePriority> = {
  baixa: "LOW",
  media: "MEDIUM",
  média: "MEDIUM",
  alta: "HIGH",
  critica: "CRITICAL",
  crítica: "CRITICAL",
};

interface Resultado {
  simulacao: boolean;
  resumo: Record<string, { criados: number; ignorados: number; comErro: number }>;
  problemas: Problema[];
  ignorados: { aba: string; linha: number; motivo: string }[];
}

/**
 * Processa a planilha. Com `simular`, nao grava nada - so devolve o que aconteceria.
 *
 * O que ja existe (mesmo nome, mesmo TAG) e' IGNORADO, nunca sobrescrito: uma importacao
 * repetida por engano nao pode apagar o que a equipe ja ajustou a mao depois.
 */
async function processar(
  wb: ExcelJS.Workbook,
  clientId: string,
  opcoes: { simular: boolean; userId?: string },
): Promise<Resultado> {
  const problemas: Problema[] = [];
  const ignorados: { aba: string; linha: number; motivo: string }[] = [];
  const resumo: Resultado["resumo"] = {};
  const contar = (aba: string, campo: "criados" | "ignorados" | "comErro") => {
    resumo[aba] = resumo[aba] ?? { criados: 0, ignorados: 0, comErro: 0 };
    resumo[aba][campo] += 1;
  };

  const erro = (aba: string, linha: number, mensagem: string) => {
    problemas.push({ aba, linha, mensagem });
    contar(aba, "comErro");
  };
  const ignorar = (aba: string, linha: number, motivo: string) => {
    ignorados.push({ aba, linha, motivo });
    contar(aba, "ignorados");
  };

  // Indices do que ja existe + do que sera criado nesta passada, para uma linha poder
  // referenciar outra do mesmo arquivo.
  const plantas = new Map<string, string>();
  for (const p of await prisma.plant.findMany({ where: { clientId, deletedAt: null }, select: { id: true, name: true } })) {
    plantas.set(p.name.toLowerCase(), p.id);
  }
  // Indexado pelo NUMERO (identidade) e tambem pelo nome, para aceitar planilha antiga.
  const centros = new Map<string, string>();
  for (const c of await prisma.costCenter.findMany({ where: { clientId, deletedAt: null }, select: { id: true, name: true, code: true } })) {
    if (c.code) centros.set(c.code.toLowerCase(), c.id);
    centros.set(c.name.toLowerCase(), c.id);
  }
  const areas = new Map<string, string>();
  for (const a of await prisma.area.findMany({ where: { clientId, deletedAt: null }, select: { id: true, name: true } })) {
    areas.set(a.name.toLowerCase(), a.id);
  }
  const ativos = new Map<string, string>();
  for (const i of await prisma.instrument.findMany({ where: { clientId, deletedAt: null, tag: { not: null } }, select: { id: true, tag: true } })) {
    ativos.set((i.tag ?? "").toLowerCase(), i.id);
  }
  const maoDeObra = new Set(
    (await prisma.laborResource.findMany({ where: { clientId, deletedAt: null }, select: { name: true } })).map((r) => r.name.toLowerCase()),
  );
  const pecas = new Set(
    (await prisma.sparePart.findMany({ where: { clientId, deletedAt: null }, select: { name: true } })).map((p) => p.name.toLowerCase()),
  );

  // ── Plantas ───────────────────────────────────────────────────────────────
  for (const { numero: n, valores } of lerAba(wb, "Plantas")) {
    const nome = valores.nome;
    if (!nome) { erro("Plantas", n, "Nome e' obrigatorio."); continue; }
    if (plantas.has(nome.toLowerCase())) { ignorar("Plantas", n, `Planta "${nome}" ja existe.`); continue; }

    if (!opcoes.simular) {
      const criada = await prisma.plant.create({ data: { clientId, name: nome, code: valores.codigo || null } });
      plantas.set(nome.toLowerCase(), criada.id);
    } else {
      plantas.set(nome.toLowerCase(), "simulado");
    }
    contar("Plantas", "criados");
  }

  // ── Centros de custo ──────────────────────────────────────────────────────
  for (const { numero: n, valores } of lerAba(wb, "Centros de custo")) {
    const numeroDoCentro = valores.codigo;
    const nome = valores.nome;
    if (!numeroDoCentro) { erro("Centros de custo", n, "Numero e' obrigatorio - e' ele que identifica o centro de custo."); continue; }
    if (!nome) { erro("Centros de custo", n, "Descricao e' obrigatoria."); continue; }
    if (centros.has(numeroDoCentro.toLowerCase())) { ignorar("Centros de custo", n, `Centro de custo "${numeroDoCentro}" ja existe.`); continue; }

    if (!opcoes.simular) {
      const criado = await prisma.costCenter.create({ data: { clientId, name: nome, code: numeroDoCentro } });
      centros.set(numeroDoCentro.toLowerCase(), criado.id);
      centros.set(nome.toLowerCase(), criado.id);
    } else {
      centros.set(numeroDoCentro.toLowerCase(), "simulado");
      centros.set(nome.toLowerCase(), "simulado");
    }
    contar("Centros de custo", "criados");
  }

  // ── Areas ─────────────────────────────────────────────────────────────────
  for (const { numero: n, valores } of lerAba(wb, "Areas")) {
    const nome = valores.nome;
    if (!nome) { erro("Areas", n, "Nome e' obrigatorio."); continue; }
    if (!valores.planta) { erro("Areas", n, "Planta e' obrigatoria."); continue; }

    const plantaId = plantas.get(valores.planta.toLowerCase());
    if (!plantaId) { erro("Areas", n, `Planta "${valores.planta}" nao existe - cadastre na aba Plantas.`); continue; }
    if (areas.has(nome.toLowerCase())) { ignorar("Areas", n, `Area "${nome}" ja existe.`); continue; }

    let centroId: string | null = null;
    if (valores.centroDeCusto) {
      centroId = centros.get(valores.centroDeCusto.toLowerCase()) ?? null;
      if (!centroId) { erro("Areas", n, `Centro de custo "${valores.centroDeCusto}" nao existe - use o numero cadastrado na aba Centros de custo.`); continue; }
    }

    if (!opcoes.simular) {
      const criada = await prisma.area.create({
        data: { clientId, name: nome, plantId: plantaId, costCenterId: centroId === "simulado" ? null : centroId, code: valores.codigo || null },
      });
      areas.set(nome.toLowerCase(), criada.id);
    } else {
      areas.set(nome.toLowerCase(), "simulado");
    }
    contar("Areas", "criados");
  }

  // ── Ativos ────────────────────────────────────────────────────────────────
  const linhasDeAtivo = lerAba(wb, "Ativos");
  if (linhasDeAtivo.length > 0 && !opcoes.simular) {
    // Um plano com limite de ativos precisa ser respeitado tambem na importacao - senao a
    // planilha seria a porta dos fundos para estourar o contrato.
    await assertInstrumentLimitNotExceeded(clientId);
  }

  for (const { numero: n, valores } of linhasDeAtivo) {
    const tag = valores.tag;
    if (!tag) { erro("Ativos", n, "TAG e' obrigatorio."); continue; }
    if (!valores.descricao) { erro("Ativos", n, "Descricao e' obrigatoria."); continue; }
    if (ativos.has(tag.toLowerCase())) { ignorar("Ativos", n, `Ja existe um ativo com o TAG "${tag}".`); continue; }

    let parentId: string | null = null;
    if (valores.tagDoPai) {
      parentId = ativos.get(valores.tagDoPai.toLowerCase()) ?? null;
      if (!parentId) {
        erro("Ativos", n, `Ativo pai "${valores.tagDoPai}" nao encontrado - coloque a linha do pai ANTES da do filho.`);
        continue;
      }
    }

    let plantId: string | null = null;
    if (valores.planta) {
      plantId = plantas.get(valores.planta.toLowerCase()) ?? null;
      if (!plantId) { erro("Ativos", n, `Planta "${valores.planta}" nao existe.`); continue; }
    }
    let areaId: string | null = null;
    if (valores.area) {
      areaId = areas.get(valores.area.toLowerCase()) ?? null;
      if (!areaId) { erro("Ativos", n, `Area "${valores.area}" nao existe.`); continue; }
    }

    let criticidade: MaintenancePriority = "MEDIUM";
    if (valores.criticidade) {
      const encontrada = CRITICIDADES[valores.criticidade.trim().toLowerCase()];
      if (!encontrada) { erro("Ativos", n, `Criticidade "${valores.criticidade}" invalida - use Baixa, Media, Alta ou Critica.`); continue; }
      criticidade = encontrada;
    }

    if (!opcoes.simular) {
      // Planta/area do pai mandam: o ativo filho herda o contexto, igual ao cadastro manual.
      let contextoPlanta = plantId;
      let contextoArea = areaId;
      let contextoCentro: string | null = null;
      if (parentId) {
        const pai = await prisma.instrument.findFirst({ where: { id: parentId }, select: { plantId: true, areaId: true, costCenterId: true } });
        contextoPlanta = pai?.plantId ?? null;
        contextoArea = pai?.areaId ?? null;
        contextoCentro = pai?.costCenterId ?? null;
      } else if (areaId) {
        const area = await prisma.area.findFirst({ where: { id: areaId }, select: { costCenterId: true } });
        contextoCentro = area?.costCenterId ?? null;
      }

      const criado = await prisma.instrument.create({
        data: {
          clientId,
          tag,
          description: valores.descricao,
          type: valores.tipo || "A definir",
          parentId,
          plantId: contextoPlanta,
          areaId: contextoArea,
          costCenterId: contextoCentro,
          criticality: criticidade,
          manufacturer: valores.fabricante || null,
          model: valores.modelo || null,
          serialNumber: valores.numeroDeSerie || null,
          calibratable: simNao(valores.calibravel),
          createdById: opcoes.userId,
        },
      });
      ativos.set(tag.toLowerCase(), criado.id);
    } else {
      ativos.set(tag.toLowerCase(), "simulado");
    }
    contar("Ativos", "criados");
  }

  // ── Mao de obra ───────────────────────────────────────────────────────────
  for (const { numero: n, valores } of lerAba(wb, "Mao de obra")) {
    if (!valores.nome) { erro("Mao de obra", n, "Nome e' obrigatorio."); continue; }
    if (!valores.tipo) { erro("Mao de obra", n, "Tipo e' obrigatorio."); continue; }
    if (maoDeObra.has(valores.nome.toLowerCase())) { ignorar("Mao de obra", n, `"${valores.nome}" ja esta cadastrado.`); continue; }

    const valorHora = numero(valores.valorHora);
    if (valores.valorHora && valorHora == null) { erro("Mao de obra", n, `Valor/hora "${valores.valorHora}" nao e' um numero.`); continue; }

    if (!opcoes.simular) {
      await prisma.laborResource.create({
        data: {
          clientId,
          name: valores.nome,
          type: valores.tipo,
          registrationNumber: valores.registro || null,
          hourlyRate: valorHora,
          createdById: opcoes.userId,
        },
      });
    }
    maoDeObra.add(valores.nome.toLowerCase());
    contar("Mao de obra", "criados");
  }

  // ── Almoxarifado ──────────────────────────────────────────────────────────
  for (const { numero: n, valores } of lerAba(wb, "Almoxarifado")) {
    if (!valores.nome) { erro("Almoxarifado", n, "Nome e' obrigatorio."); continue; }
    if (pecas.has(valores.nome.toLowerCase())) { ignorar("Almoxarifado", n, `Peca "${valores.nome}" ja esta cadastrada.`); continue; }

    const saldo = numero(valores.saldoInicial) ?? 0;
    const minimo = numero(valores.estoqueMinimo) ?? 0;
    const custo = numero(valores.custoUnitario);
    if (valores.saldoInicial && numero(valores.saldoInicial) == null) { erro("Almoxarifado", n, `Saldo inicial "${valores.saldoInicial}" nao e' um numero.`); continue; }
    if (valores.custoUnitario && custo == null) { erro("Almoxarifado", n, `Custo unitario "${valores.custoUnitario}" nao e' um numero.`); continue; }
    if (saldo < 0) { erro("Almoxarifado", n, "Saldo inicial nao pode ser negativo."); continue; }

    if (!opcoes.simular) {
      const criada = await prisma.sparePart.create({
        data: {
          clientId,
          name: valores.nome,
          code: valores.codigo || null,
          category: valores.categoria || null,
          unit: valores.unidade || "un",
          minStock: Math.trunc(minimo),
          unitCost: custo,
          createdById: opcoes.userId,
        },
      });
      // O saldo inicial entra como movimento, nao como campo: assim o historico do
      // almoxarifado comeca contando a verdade desde o primeiro dia.
      if (saldo > 0) {
        await applySparePartMovement({
          sparePartId: criada.id,
          type: "IN",
          quantity: Math.trunc(saldo),
          unitCost: custo ?? undefined,
          reason: "Saldo inicial (importacao de planilha)",
          createdById: opcoes.userId,
        });
      }
    }
    pecas.add(valores.nome.toLowerCase());
    contar("Almoxarifado", "criados");
  }

  return { simulacao: opcoes.simular, resumo, problemas, ignorados };
}

async function abrirPlanilha(req: Request): Promise<ExcelJS.Workbook> {
  const file = req.file;
  if (!file) throw new ValidationError("Selecione a planilha preenchida.");

  const wb = new ExcelJS.Workbook();
  try {
    // O tipo de Buffer do Node 22 e o esperado pelo exceljs divergem no @types; o dado
    // e' o mesmo (bytes do arquivo), so a assinatura que nao bate.
    await wb.xlsx.load(file.buffer as unknown as ArrayBuffer);
  } catch {
    throw new ValidationError("Nao foi possivel ler o arquivo. Envie o modelo em .xlsx, sem converter para outro formato.");
  }

  const conhecidas = ABAS.map((a) => a.nome);
  if (!wb.worksheets.some((ws) => conhecidas.includes(ws.name))) {
    throw new ValidationError(
      `Este arquivo nao tem nenhuma das abas esperadas (${conhecidas.join(", ")}). Baixe o modelo e preencha sobre ele.`,
    );
  }
  return wb;
}

/** Confere o arquivo e devolve o que aconteceria - sem gravar nada. */
export const simularImportacao = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const clientId = resolveClientId(req, (req.body as { clientId?: string })?.clientId);
  const cliente = await prisma.client.findFirst({ where: { id: clientId, deletedAt: null }, select: { id: true } });
  if (!cliente) throw new NotFoundError("Cliente");

  const wb = await abrirPlanilha(req);
  const resultado = await processar(wb, clientId, { simular: true, userId: req.user?.sub });
  res.json(resultado);
});

/** Grava de verdade. So depois de o usuario ver a conferencia. */
export const confirmarImportacao = asyncHandler(async (req: Request, res: Response) => {
  await assertServiceAccess(req, ["CMMS_MAINTENANCE"]);
  const clientId = resolveClientId(req, (req.body as { clientId?: string })?.clientId);
  const cliente = await prisma.client.findFirst({ where: { id: clientId, deletedAt: null }, select: { id: true, companyName: true } });
  if (!cliente) throw new NotFoundError("Cliente");

  const wb = await abrirPlanilha(req);

  // Segunda conferencia antes de gravar: o arquivo pode ter sido trocado entre a
  // simulacao e a confirmacao, e o banco pode ter mudado nesse meio-tempo.
  const conferencia = await processar(wb, clientId, { simular: true, userId: req.user?.sub });
  if (conferencia.problemas.length > 0) {
    throw new ValidationError(
      `A planilha tem ${conferencia.problemas.length} erro(s) - corrija e envie de novo. Nada foi importado.`,
    );
  }

  const resultado = await processar(wb, clientId, { simular: false, userId: req.user?.sub });

  const total = Object.values(resultado.resumo).reduce((soma, r) => soma + r.criados, 0);
  await writeAuditLog({
    userId: req.user?.sub,
    action: "CREATE",
    entityType: "Client",
    entityId: clientId,
    description: `Importacao por planilha: ${total} registro(s) criado(s) em ${cliente.companyName}`,
  });

  res.status(201).json(resultado);
});
