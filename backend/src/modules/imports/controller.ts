import type { Request, Response } from "express";
import ExcelJS from "exceljs";
import { AssetHierarchyLevel, MaintenancePriority } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { assertServiceAccess, clientScopeFilter, resolveClientId } from "../../middleware/rbac";
import { writeAuditLog } from "../../utils/audit";
import { applySparePartMovement } from "../../lib/inventory";
import { assertInstrumentLimitNotExceeded } from "../../lib/planLimits";
import { ABAS, gerarPlanilhaModelo, type ListasDoCliente } from "./template";

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
  const listas: ListasDoCliente = {};
  if (alvo) {
    // O modelo sai com o que a empresa JA tem: planta, area, tipo de ativo e funcao viram
    // menu suspenso na celula. Digitar um nome que nao existe era o erro mais comum da
    // importacao, e so aparecia depois de enviar o arquivo inteiro.
    const [cliente, plantas, areas, tipos, funcoes] = await Promise.all([
      prisma.client.findFirst({ where: { id: alvo }, select: { companyName: true } }),
      prisma.plant.findMany({ where: { clientId: alvo, deletedAt: null, active: true }, select: { name: true }, orderBy: { name: "asc" } }),
      prisma.area.findMany({ where: { clientId: alvo, deletedAt: null, active: true }, select: { name: true }, orderBy: { name: "asc" } }),
      prisma.assetType.findMany({ where: { active: true, OR: [{ clientId: null }, { clientId: alvo }] }, select: { name: true }, orderBy: { name: "asc" } }),
      prisma.laborType.findMany({ where: { active: true, OR: [{ clientId: null }, { clientId: alvo }] }, select: { name: true }, orderBy: { name: "asc" } }),
    ]);
    nome = cliente?.companyName;
    listas.plantas = plantas.map((x) => x.name);
    listas.areas = areas.map((x) => x.name);
    listas.tiposDeAtivo = tipos.map((x) => x.name);
    listas.funcoes = funcoes.map((x) => x.name);
  }

  const arquivo = await gerarPlanilhaModelo(nome, listas);
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

/** O TAG e' a identidade do ativo: comparado sem espaco sobrando e sem diferenciar
 * maiuscula de minuscula, porque " vtp-vot-l4 " e "VTP-VOT-L4" sao o mesmo equipamento
 * para quem preencheu a planilha. */
function normalizarTag(valor: string | undefined): string {
  return (valor ?? "").trim().replace(/\s+/g, " ").toUpperCase();
}

const NIVEIS: Record<string, AssetHierarchyLevel> = {
  planta: "PLANT",
  area: "AREA",
  "área": "AREA",
  linha: "AREA",
  maquina: "MACHINE",
  "máquina": "MACHINE",
  equipamento: "MACHINE",
  subconjunto: "SUBASSEMBLY",
  parte: "PART",
  componente: "PART",
  peca: "PART",
  "peça": "PART",
};

const ROTULO_DO_NIVEL: Record<AssetHierarchyLevel, string> = {
  PLANT: "Planta",
  AREA: "Area",
  MACHINE: "Maquina",
  SUBASSEMBLY: "Subconjunto",
  PART: "Parte",
};

const ROTULOS_DE_CAMPO: Record<string, string> = {
  description: "descricao",
  manufacturer: "fabricante",
  model: "modelo",
  serialNumber: "numero de serie",
  level: "nivel",
  type: "tipo",
  criticality: "criticidade",
  calibratable: "calibravel",
  lubricatable: "lubrificavel",
};
const rotuloDoCampo = (campo: string) => ROTULOS_DE_CAMPO[campo] ?? campo;

/** Dados do ativo que ja esta no sistema, usados para dizer o que a planilha muda. */
interface AtivoExistente {
  description: string | null;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  level: AssetHierarchyLevel | null;
  type: string;
  criticality: MaintenancePriority;
  calibratable: boolean;
  lubricatable: boolean;
}

/**
 * O que a planilha diz de diferente do que ja esta gravado.
 *
 * E' o que transforma "ja existe, ignorei" numa informacao util: quem reenvia a planilha
 * corrigida precisa saber que a correcao NAO entrou, e em que campo.
 */
function compararComOSistema(
  atual: AtivoExistente,
  valores: Record<string, string>,
  nivel: AssetHierarchyLevel | undefined,
  criticidade: MaintenancePriority,
): string[] {
  const diferencas: string[] = [];
  const conferir = (campo: string, noSistema: string, naPlanilha: string) => {
    if (naPlanilha && naPlanilha.trim().toLowerCase() !== (noSistema ?? "").trim().toLowerCase()) {
      diferencas.push(`${rotuloDoCampo(campo)} (sistema: "${noSistema || "vazio"}", planilha: "${naPlanilha}")`);
    }
  };

  conferir("description", atual.description ?? "", valores.descricao ?? "");
  conferir("manufacturer", atual.manufacturer ?? "", valores.fabricante ?? "");
  conferir("model", atual.model ?? "", valores.modelo ?? "");
  conferir("serialNumber", atual.serialNumber ?? "", valores.numeroDeSerie ?? "");
  if (valores.tipo) conferir("type", atual.type, valores.tipo);
  if (nivel && atual.level !== nivel) {
    diferencas.push(`nivel (sistema: "${atual.level ? ROTULO_DO_NIVEL[atual.level] : "sem nivel"}", planilha: "${valores.nivel}")`);
  }
  if (valores.criticidade && atual.criticality !== criticidade) {
    diferencas.push(`criticidade (sistema: "${atual.criticality}", planilha: "${valores.criticidade}")`);
  }
  if (valores.calibravel && simNao(valores.calibravel) !== atual.calibratable) diferencas.push("calibravel");
  if (valores.lubrificavel && simNao(valores.lubrificavel) !== atual.lubricatable) diferencas.push("lubrificavel");
  return diferencas;
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
  resumo: Record<string, { criados: number; ignorados: number; completados: number; comErro: number }>;
  problemas: Problema[];
  ignorados: { aba: string; linha: number; motivo: string }[];
  /** Registros que ja existiam e tiveram campos VAZIOS preenchidos (modo "completar"). */
  completados: { aba: string; linha: number; motivo: string }[];
}

/** O que fazer com um registro que ja existe. Ignorar e' o padrao: uma importacao repetida
 * por engano nao pode apagar o que a equipe ajustou a mao depois. */
export type ModoDeImportacao = "ignorar" | "completar";

/**
 * Processa a planilha. Com `simular`, nao grava nada - so devolve o que aconteceria.
 *
 * O que ja existe (mesmo nome, mesmo TAG) e' IGNORADO, nunca sobrescrito: uma importacao
 * repetida por engano nao pode apagar o que a equipe ja ajustou a mao depois.
 */
async function processar(
  wb: ExcelJS.Workbook,
  clientId: string,
  opcoes: { simular: boolean; userId?: string; modo?: ModoDeImportacao },
): Promise<Resultado> {
  const problemas: Problema[] = [];
  const ignorados: { aba: string; linha: number; motivo: string }[] = [];
  const resumo: Resultado["resumo"] = {};
  const completados: { aba: string; linha: number; motivo: string }[] = [];
  const contar = (aba: string, campo: "criados" | "ignorados" | "completados" | "comErro") => {
    resumo[aba] = resumo[aba] ?? { criados: 0, ignorados: 0, completados: 0, comErro: 0 };
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
  const completar = (aba: string, linha: number, motivo: string) => {
    completados.push({ aba, linha, motivo });
    contar(aba, "completados");
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
  // Guarda tambem os dados atuais: e' com eles que a conferencia diz o que a planilha
  // mudaria num ativo que ja existe, em vez de so avisar "ja existe".
  const ativos = new Map<string, { id: string; dados: AtivoExistente | null }>();
  for (const i of await prisma.instrument.findMany({
    where: { clientId, deletedAt: null, tag: { not: null } },
    select: {
      id: true, tag: true, description: true, manufacturer: true, model: true,
      serialNumber: true, level: true, type: true, criticality: true,
      calibratable: true, lubricatable: true,
    },
  })) {
    const { id, tag, ...dados } = i;
    ativos.set(normalizarTag(tag ?? ""), { id, dados });
  }

  const tiposDeAtivo = new Map<string, AssetHierarchyLevel | null>();
  for (const t of await prisma.assetType.findMany({
    where: { active: true, OR: [{ clientId: null }, { clientId }] },
    select: { name: true, level: true },
  })) {
    tiposDeAtivo.set(t.name.toLowerCase(), t.level);
  }
  const maoDeObra = new Set(
    (await prisma.laborResource.findMany({ where: { clientId, deletedAt: null }, select: { name: true } })).map((r) => r.name.toLowerCase()),
  );
  const funcoes = new Set(
    (
      await prisma.laborType.findMany({
        where: { active: true, OR: [{ clientId: null }, { clientId }] },
        select: { name: true },
      })
    ).map((t) => t.name.toLowerCase()),
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

  // ── Areas ─────────────────────────────────────────────────────────────────
  for (const { numero: n, valores } of lerAba(wb, "Areas")) {
    const nome = valores.nome;
    if (!nome) { erro("Areas", n, "Nome e' obrigatorio."); continue; }
    if (!valores.planta) { erro("Areas", n, "Planta e' obrigatoria."); continue; }

    const plantaId = plantas.get(valores.planta.toLowerCase());
    if (!plantaId) { erro("Areas", n, `Planta "${valores.planta}" nao existe - cadastre na aba Plantas.`); continue; }
    if (areas.has(nome.toLowerCase())) { ignorar("Areas", n, `Area "${nome}" ja existe.`); continue; }

    // Area e centro de custo sao um cadastro so: o numero digitado aqui e' reaproveitado
    // se ja existir, e criado se for novo - nao ha aba separada para cadastra-lo antes.
    let centroId: string | null = null;
    const numeroDoCentro = valores.centroDeCusto?.trim();
    if (numeroDoCentro) {
      centroId = centros.get(numeroDoCentro.toLowerCase()) ?? null;
      if (!centroId && !opcoes.simular) {
        const criado = await prisma.costCenter.create({ data: { clientId, code: numeroDoCentro, name: numeroDoCentro } });
        centroId = criado.id;
        centros.set(numeroDoCentro.toLowerCase(), criado.id);
      } else if (!centroId) {
        centroId = "simulado";
        centros.set(numeroDoCentro.toLowerCase(), "simulado");
      }
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

  const tagsDaPlanilha = new Set<string>();

  for (const { numero: n, valores } of linhasDeAtivo) {
    const tag = normalizarTag(valores.tag);
    if (!tag) { erro("Ativos", n, "TAG e' obrigatorio."); continue; }
    if (!valores.descricao) { erro("Ativos", n, "Descricao e' obrigatoria."); continue; }

    // O mesmo TAG duas vezes na planilha e' engano de quem preencheu, nao um pedido para
    // gravar a ultima linha em silencio.
    if (tagsDaPlanilha.has(tag)) { erro("Ativos", n, `O TAG "${valores.tag}" aparece mais de uma vez nesta planilha.`); continue; }
    tagsDaPlanilha.add(tag);

    const nivel = valores.nivel ? NIVEIS[valores.nivel.trim().toLowerCase()] : undefined;
    if (valores.nivel && !nivel) {
      erro("Ativos", n, `Nivel "${valores.nivel}" invalido - use Planta, Area, Maquina, Subconjunto ou Parte.`);
      continue;
    }

    let criticidade: MaintenancePriority = "MEDIUM";
    if (valores.criticidade) {
      const encontrada = CRITICIDADES[valores.criticidade.trim().toLowerCase()];
      if (!encontrada) { erro("Ativos", n, `Criticidade "${valores.criticidade}" invalida - use Baixa, Media, Alta ou Critica.`); continue; }
      criticidade = encontrada;
    }

    // ── Ja existe? ────────────────────────────────────────────────────────
    const jaExiste = ativos.get(tag);
    if (jaExiste) {
      const atual = jaExiste.dados;
      const diferencas = atual ? compararComOSistema(atual, valores, nivel, criticidade) : [];

      if (opcoes.modo === "completar" && atual) {
        // Preenche SO o que esta vazio no sistema. Um valor ja gravado nunca e' trocado:
        // quem ajustou a ficha a mao depois da ultima planilha nao pode perder o ajuste.
        const preencher: Record<string, unknown> = {};
        if (!atual.description && valores.descricao) preencher.description = valores.descricao;
        if (!atual.manufacturer && valores.fabricante) preencher.manufacturer = valores.fabricante;
        if (!atual.model && valores.modelo) preencher.model = valores.modelo;
        if (!atual.serialNumber && valores.numeroDeSerie) preencher.serialNumber = valores.numeroDeSerie;
        if (!atual.level && nivel) preencher.level = nivel;
        if ((!atual.type || atual.type === "A definir") && valores.tipo) preencher.type = valores.tipo;
        if (!atual.calibratable && simNao(valores.calibravel)) preencher.calibratable = true;
        if (!atual.lubricatable && simNao(valores.lubrificavel)) preencher.lubricatable = true;

        if (Object.keys(preencher).length === 0) {
          ignorar("Ativos", n, `TAG "${valores.tag}" ja existe e nao tem campo vazio para completar.`);
          continue;
        }
        if (!opcoes.simular) await prisma.instrument.update({ where: { id: jaExiste.id }, data: preencher });
        completar("Ativos", n, `TAG "${valores.tag}": ${Object.keys(preencher).map(rotuloDoCampo).join(", ")}.`);
        continue;
      }

      ignorar(
        "Ativos",
        n,
        diferencas.length > 0
          ? `TAG "${valores.tag}" ja existe. Diferente da planilha em: ${diferencas.join("; ")}.`
          : `TAG "${valores.tag}" ja existe, igual ao da planilha.`,
      );
      continue;
    }

    let parentId: string | null = null;
    if (valores.tagDoPai) {
      parentId = ativos.get(normalizarTag(valores.tagDoPai))?.id ?? null;
      if (!parentId) {
        erro("Ativos", n, `Ativo pai "${valores.tagDoPai}" nao encontrado - coloque a linha do pai ANTES da do filho.`);
        continue;
      }
    }

    // Mesma regra do cadastro manual: so o nivel Planta fica na raiz da arvore.
    if (nivel && nivel !== "PLANT" && !parentId) {
      erro("Ativos", n, `Nivel "${valores.nivel}" exige o TAG do ativo pai - so Planta fica no topo da arvore.`);
      continue;
    }

    // O tipo, quando informado, tem que existir no catalogo e no nivel escolhido - senao
    // a lista de tipos volta a virar texto livre pela porta da planilha.
    if (valores.tipo) {
      const chaveTipo = valores.tipo.trim().toLowerCase();
      // .has() e nao !valor: um tipo sem nivel definido (ex.: "Outro", deixado assim de
      // proposito) esta no catalogo com o valor null - "!null" e' true, e a checagem
      // antiga rejeitava esse tipo como se nao existisse. Foi o que derrubou uma
      // importacao inteira: o tipo da raiz falhou, e cada descendente que apontava para
      // ela em cascata falhou atras com "ativo pai nao encontrado".
      if (!tiposDeAtivo.has(chaveTipo)) {
        erro("Ativos", n, `Tipo "${valores.tipo}" nao existe em Cadastros > Tipos de ativo.`);
        continue;
      }
      const doCatalogo = tiposDeAtivo.get(chaveTipo);
      if (nivel && doCatalogo && doCatalogo !== nivel) {
        erro("Ativos", n, `Tipo "${valores.tipo}" nao pertence ao nivel "${valores.nivel}".`);
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
          tag: valores.tag.trim(),
          description: valores.descricao,
          level: nivel ?? null,
          type: valores.tipo || (nivel ? ROTULO_DO_NIVEL[nivel] : "A definir"),
          parentId,
          plantId: contextoPlanta,
          areaId: contextoArea,
          costCenterId: contextoCentro,
          criticality: criticidade,
          manufacturer: valores.fabricante || null,
          model: valores.modelo || null,
          serialNumber: valores.numeroDeSerie || null,
          calibratable: simNao(valores.calibravel),
          lubricatable: simNao(valores.lubrificavel),
          createdById: opcoes.userId,
        },
      });
      ativos.set(tag, { id: criado.id, dados: null });
    } else {
      ativos.set(tag, { id: "simulado", dados: null });
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
      // A funcao tem que existir no catalogo - e' de la que o formulario escolhe. Uma
      // funcao nova vinda da planilha entra no catalogo junto, senao ela ficaria gravada
      // no recurso mas invisivel para quem for cadastrar o proximo a mao.
      const chave = valores.tipo.trim().toLowerCase();
      if (!funcoes.has(chave)) {
        await prisma.laborType.create({ data: { clientId, name: valores.tipo.trim() } });
        funcoes.add(chave);
      }

      await prisma.laborResource.create({
        data: {
          clientId,
          name: valores.nome,
          type: valores.tipo.trim(),
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

  return { simulacao: opcoes.simular, resumo, problemas, ignorados, completados };
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
  const modo = (req.body as { modo?: ModoDeImportacao })?.modo === "completar" ? "completar" : "ignorar";
  const resultado = await processar(wb, clientId, { simular: true, userId: req.user?.sub, modo });
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

  const modo = (req.body as { modo?: ModoDeImportacao })?.modo === "completar" ? "completar" : "ignorar";
  const resultado = await processar(wb, clientId, { simular: false, userId: req.user?.sub, modo });

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
