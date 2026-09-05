import ExcelJS from "exceljs";

/**
 * Planilha padrao de importacao.
 *
 * Uma aba por tipo de cadastro, na ORDEM em que precisam ser importados (a area depende da
 * planta, o ativo depende da area, o componente depende do ativo pai). A primeira aba
 * explica isso, porque quem recebe o arquivo por e-mail nao tem o manual junto.
 *
 * As colunas obrigatorias vem marcadas com "*" no cabecalho e em cor diferente - e' a
 * unica pista que sobrevive ao arquivo ser reenviado, renomeado e reaberto no celular.
 */

export interface DefinicaoDeAba {
  nome: string;
  descricao: string;
  colunas: { chave: string; titulo: string; obrigatoria?: boolean; ajuda: string; largura?: number }[];
  exemplo: Record<string, string | number>[];
}

export const ABAS: DefinicaoDeAba[] = [
  {
    nome: "Plantas",
    descricao: "Unidades/fabricas da empresa. Importe primeiro: as areas dependem delas.",
    colunas: [
      { chave: "nome", titulo: "Nome*", obrigatoria: true, ajuda: "Nome da planta. Ex.: Planta Votorantim", largura: 34 },
      { chave: "codigo", titulo: "Codigo", ajuda: "Opcional. Ex.: VOT", largura: 14 },
    ],
    exemplo: [{ nome: "Planta Votorantim", codigo: "VOT" }],
  },
  {
    nome: "Centros de custo",
    descricao: "Para onde o custo da manutencao vai. Cada area aponta para um deles.",
    colunas: [
      { chave: "nome", titulo: "Nome*", obrigatoria: true, ajuda: "Ex.: Manutencao Mecanica", largura: 34 },
      { chave: "codigo", titulo: "Codigo", ajuda: "Opcional. Ex.: CC-100", largura: 14 },
    ],
    exemplo: [{ nome: "Manutencao Mecanica", codigo: "CC-100" }],
  },
  {
    nome: "Areas",
    descricao: "Areas/linhas dentro de cada planta. O centro de custo daqui e' herdado por todos os ativos da area.",
    colunas: [
      { chave: "nome", titulo: "Nome*", obrigatoria: true, ajuda: "Ex.: Linha 4", largura: 30 },
      { chave: "planta", titulo: "Planta*", obrigatoria: true, ajuda: "Nome exato da planta (aba Plantas)", largura: 30 },
      { chave: "centroDeCusto", titulo: "Centro de custo", ajuda: "Nome do centro de custo (aba Centros de custo)", largura: 28 },
      { chave: "codigo", titulo: "Codigo", ajuda: "Opcional", largura: 14 },
    ],
    exemplo: [{ nome: "Linha 4", planta: "Planta Votorantim", centroDeCusto: "Manutencao Mecanica", codigo: "L4" }],
  },
  {
    nome: "Ativos",
    descricao:
      "Equipamentos. O TAG e' o codigo unico da empresa. Para montar a arvore, informe o TAG do ativo pai - " +
      "e coloque o pai ANTES do filho nas linhas. Planta e area so no ativo do topo: o resto herda.",
    colunas: [
      { chave: "tag", titulo: "TAG*", obrigatoria: true, ajuda: "Codigo unico. Ex.: VTP-VOT-L4-CP01", largura: 24 },
      { chave: "descricao", titulo: "Descricao*", obrigatoria: true, ajuda: "Nome em linguagem de gente. Ex.: Compressor de ar da Linha 4", largura: 40 },
      { chave: "tagDoPai", titulo: "TAG do ativo pai", ajuda: "Vazio = ativo no topo da arvore", largura: 24 },
      { chave: "planta", titulo: "Planta", ajuda: "So no ativo do topo - os filhos herdam do pai", largura: 26 },
      { chave: "area", titulo: "Area", ajuda: "So no ativo do topo - os filhos herdam do pai", largura: 24 },
      { chave: "tipo", titulo: "Tipo", ajuda: "Ex.: Maquina, Motor, Bomba. Em branco fica 'A definir'", largura: 18 },
      { chave: "criticidade", titulo: "Criticidade", ajuda: "Baixa, Media, Alta ou Critica (padrao: Media)", largura: 14 },
      { chave: "fabricante", titulo: "Fabricante", ajuda: "Opcional", largura: 20 },
      { chave: "modelo", titulo: "Modelo", ajuda: "Opcional", largura: 20 },
      { chave: "numeroDeSerie", titulo: "Numero de serie", ajuda: "Opcional", largura: 20 },
      { chave: "calibravel", titulo: "Calibravel", ajuda: "Sim/Nao. Sim = entra na lista de calibracao da OptiProcess", largura: 12 },
    ],
    exemplo: [
      { tag: "VTP-VOT-L4", descricao: "Linha 4", tagDoPai: "", planta: "Planta Votorantim", area: "Linha 4", tipo: "Linha", criticidade: "Alta", fabricante: "", modelo: "", numeroDeSerie: "", calibravel: "Nao" },
      { tag: "VTP-VOT-L4-CP01", descricao: "Compressor de ar", tagDoPai: "VTP-VOT-L4", planta: "", area: "", tipo: "Maquina", criticidade: "Alta", fabricante: "Atlas Copco", modelo: "GA75", numeroDeSerie: "ACP-99120", calibravel: "Nao" },
    ],
  },
  {
    nome: "Mao de obra",
    descricao: "Quem executa as OS. O valor/hora alimenta o custo de manutencao por ativo - deixe em branco se nao quiser apurar custo.",
    colunas: [
      { chave: "nome", titulo: "Nome*", obrigatoria: true, ajuda: "Ex.: Joao da Silva", largura: 32 },
      { chave: "tipo", titulo: "Tipo*", obrigatoria: true, ajuda: "Ex.: Tecnico mecanico, Tecnico eletrico, Terceiro", largura: 24 },
      { chave: "registro", titulo: "Registro (DRT/CREA)", ajuda: "Opcional", largura: 20 },
      { chave: "valorHora", titulo: "Valor/hora", ajuda: "Opcional. Numero. Ex.: 60", largura: 14 },
    ],
    exemplo: [{ nome: "Joao da Silva", tipo: "Tecnico mecanico", registro: "", valorHora: 60 }],
  },
  {
    nome: "Almoxarifado",
    descricao: "Pecas de manutencao. O saldo inicial entra como uma entrada de estoque, com o custo unitario informado.",
    colunas: [
      { chave: "nome", titulo: "Nome*", obrigatoria: true, ajuda: "Ex.: Rolamento 6205", largura: 34 },
      { chave: "codigo", titulo: "Codigo", ajuda: "Opcional. Ex.: PE-0001", largura: 16 },
      { chave: "categoria", titulo: "Categoria", ajuda: "Ex.: Rolamentos", largura: 20 },
      { chave: "unidade", titulo: "Unidade", ajuda: "un, kg, g, m, L (padrao: un)", largura: 12 },
      { chave: "saldoInicial", titulo: "Saldo inicial", ajuda: "Quantidade em estoque hoje. Numero inteiro.", largura: 14 },
      { chave: "estoqueMinimo", titulo: "Estoque minimo", ajuda: "Abaixo disso o sistema alerta", largura: 16 },
      { chave: "custoUnitario", titulo: "Custo unitario", ajuda: "Opcional. Numero. Ex.: 45.90", largura: 16 },
    ],
    exemplo: [{ nome: "Rolamento 6205", codigo: "PE-0001", categoria: "Rolamentos", unidade: "un", saldoInicial: 10, estoqueMinimo: 2, custoUnitario: 45.9 }],
  },
];

const AZUL = "FF0060C0";
const CINZA = "FFF1F3F5";

export async function gerarPlanilhaModelo(nomeDaEmpresa?: string): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "OptiProcess - RLP Maintenance CMMS";
  wb.created = new Date();

  // ── Instrucoes ────────────────────────────────────────────────────────────
  const guia = wb.addWorksheet("Como preencher", { properties: { tabColor: { argb: AZUL } } });
  guia.columns = [{ width: 4 }, { width: 110 }];

  const linhas: [string, string][] = [
    ["titulo", "Importacao de dados - RLP Maintenance CMMS"],
    ["texto", nomeDaEmpresa ? `Planilha gerada para: ${nomeDaEmpresa}` : "Preencha as abas e envie o arquivo pelo sistema."],
    ["vazio", ""],
    ["secao", "Como funciona"],
    ["texto", "1. Preencha as abas na ordem em que aparecem: Plantas, Centros de custo, Areas, Ativos, Mao de obra, Almoxarifado."],
    ["texto", "2. A ordem importa porque um registro depende do outro: a area precisa da planta, o ativo precisa da area, o componente precisa do ativo pai."],
    ["texto", "3. Colunas com * no titulo sao obrigatorias. As demais podem ficar em branco."],
    ["texto", "4. As referencias entre abas sao pelo NOME (ou pelo TAG, no caso de ativo pai) - escreva exatamente igual."],
    ["texto", "5. Nao renomeie as abas nem as colunas, e nao apague a linha de titulo."],
    ["texto", "6. Pode apagar as linhas de exemplo (elas vem em cinza) ou escrever por cima delas."],
    ["texto", "7. Aba que voce nao for usar pode ficar vazia - ela e' simplesmente ignorada."],
    ["vazio", ""],
    ["secao", "Ao enviar"],
    ["texto", "O sistema confere o arquivo inteiro ANTES de gravar qualquer coisa e mostra, linha a linha, o que estiver errado."],
    ["texto", "Nada e' importado enquanto voce nao confirmar. Registro que ja existe (mesmo TAG, mesmo nome) e' ignorado, nunca sobrescrito."],
    ["vazio", ""],
    ["secao", "Abas desta planilha"],
  ];

  for (const [tipo, texto] of linhas) {
    const linha = guia.addRow(["", texto]);
    const celula = linha.getCell(2);
    if (tipo === "titulo") {
      celula.font = { size: 16, bold: true, color: { argb: AZUL } };
      linha.height = 26;
    } else if (tipo === "secao") {
      celula.font = { size: 12, bold: true };
      linha.height = 22;
    } else {
      celula.font = { size: 11 };
      celula.alignment = { wrapText: true, vertical: "top" };
    }
  }

  for (const aba of ABAS) {
    const linha = guia.addRow(["", `${aba.nome} - ${aba.descricao}`]);
    linha.getCell(2).alignment = { wrapText: true, vertical: "top" };
    linha.height = 30;
  }

  // ── Uma aba por cadastro ──────────────────────────────────────────────────
  for (const aba of ABAS) {
    const ws = wb.addWorksheet(aba.nome);
    ws.columns = aba.colunas.map((c) => ({ header: c.titulo, key: c.chave, width: c.largura ?? 20 }));

    const cabecalho = ws.getRow(1);
    cabecalho.height = 24;
    cabecalho.eachCell((celula, i) => {
      const coluna = aba.colunas[i - 1];
      celula.font = { bold: true, color: { argb: "FFFFFFFF" } };
      celula.fill = { type: "pattern", pattern: "solid", fgColor: { argb: coluna?.obrigatoria ? AZUL : "FF6B7A8A" } };
      celula.alignment = { vertical: "middle", horizontal: "left" };
      // A ajuda vira comentario da celula: quem abre a planilha no Excel ve ao passar o
      // mouse, sem precisar voltar na aba de instrucoes.
      if (coluna) celula.note = coluna.ajuda;
    });
    ws.views = [{ state: "frozen", ySplit: 1 }];

    for (const exemplo of aba.exemplo) {
      const linha = ws.addRow(exemplo);
      linha.eachCell((celula) => {
        celula.font = { italic: true, color: { argb: "FF8A94A0" } };
        celula.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CINZA } };
      });
    }
  }

  const arquivo = await wb.xlsx.writeBuffer();
  return Buffer.from(arquivo as ArrayBuffer);
}
