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

/** Nomes das listas que dependem do cadastro da empresa, montadas na hora de gerar. */
export type ListaDinamica = "plantas" | "areas" | "tiposDeAtivo" | "funcoes";

export interface DefinicaoDeColuna {
  chave: string;
  titulo: string;
  obrigatoria?: boolean;
  ajuda: string;
  largura?: number;
  /** Lista fixa de valores aceitos - vira menu suspenso na celula. */
  opcoes?: string[];
  /** Lista que vem do cadastro da empresa (tipos, funcoes, plantas...). */
  lista?: ListaDinamica;
}

export interface DefinicaoDeAba {
  nome: string;
  descricao: string;
  colunas: DefinicaoDeColuna[];
  exemplo: Record<string, string | number>[];
}

const SIM_NAO = ["Sim", "Nao"];
export const NIVEIS_DO_MODELO = ["Planta", "Area", "Maquina", "Subconjunto", "Parte"];
const CRITICIDADES_DO_MODELO = ["Baixa", "Media", "Alta", "Critica"];
const UNIDADES = ["un", "pc", "kg", "g", "L", "ml", "m", "cm", "par", "cx"];

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
    nome: "Areas",
    descricao:
      "Areas/linhas de cada planta, com o centro de custo em que a area rateia. Sao um cadastro so: o " +
      "centro nao precisa existir antes - se o numero for novo, e' criado na hora. Todo ativo da area herda ele.",
    colunas: [
      { chave: "nome", titulo: "Nome*", obrigatoria: true, ajuda: "Ex.: Linha 4", largura: 30 },
      { chave: "planta", titulo: "Planta*", obrigatoria: true, ajuda: "Nome exato da planta (aba Plantas)", largura: 30, lista: "plantas" },
      { chave: "centroDeCusto", titulo: "Centro de custo (numero)", ajuda: "So o numero. Ex.: 4101-02. Se ainda nao existir, e' criado.", largura: 28 },
      { chave: "codigo", titulo: "Codigo", ajuda: "Opcional", largura: 14 },
    ],
    exemplo: [{ nome: "Linha 4", planta: "Planta Votorantim", centroDeCusto: "4101-02", codigo: "L4" }],
  },
  {
    nome: "Ativos",
    descricao:
      "Equipamentos. O TAG e' o codigo unico da empresa - e' por ele que o sistema reconhece o que ja existe. " +
      "Para montar a arvore, informe o TAG do ativo pai e coloque o pai ANTES do filho nas linhas. " +
      "Planta e area so no ativo do topo: o resto herda.",
    colunas: [
      { chave: "tag", titulo: "TAG*", obrigatoria: true, ajuda: "Codigo unico. Ex.: VTP-VOT-L4-CP01", largura: 24 },
      { chave: "descricao", titulo: "Descricao*", obrigatoria: true, ajuda: "Nome em linguagem de gente. Ex.: Compressor de ar da Linha 4", largura: 40 },
      {
        chave: "nivel",
        titulo: "Nivel*",
        obrigatoria: true,
        ajuda: "Onde fica na arvore: Planta, Area, Maquina, Subconjunto ou Parte. So Planta fica no topo - o resto exige TAG do ativo pai.",
        largura: 16,
        opcoes: NIVEIS_DO_MODELO,
      },
      { chave: "tagDoPai", titulo: "TAG do ativo pai", ajuda: "Obrigatorio em tudo que nao for nivel Planta", largura: 24 },
      { chave: "planta", titulo: "Planta", ajuda: "So no ativo do topo - os filhos herdam do pai", largura: 26, lista: "plantas" },
      { chave: "area", titulo: "Area", ajuda: "So no ativo do topo - os filhos herdam do pai (com o centro de custo dela)", largura: 24, lista: "areas" },
      { chave: "tipo", titulo: "Tipo do equipamento", ajuda: "Opcional. Ex.: Bomba, Motor eletrico, Redutor. Precisa existir em Cadastros > Tipos de ativo, no mesmo nivel.", largura: 22, lista: "tiposDeAtivo" },
      { chave: "criticidade", titulo: "Criticidade", ajuda: "Baixa, Media, Alta ou Critica (padrao: Media)", largura: 14, opcoes: CRITICIDADES_DO_MODELO },
      { chave: "fabricante", titulo: "Fabricante", ajuda: "Opcional", largura: 20 },
      { chave: "modelo", titulo: "Modelo", ajuda: "Opcional", largura: 20 },
      { chave: "numeroDeSerie", titulo: "Numero de serie", ajuda: "Opcional", largura: 20 },
      { chave: "calibravel", titulo: "Calibravel", ajuda: "Sim/Nao. Sim = entra na lista de calibracao da OptiProcess", largura: 12, opcoes: SIM_NAO },
      { chave: "lubrificavel", titulo: "Lubrificavel", ajuda: "Sim/Nao. Sim = entra na fila de pontos de lubrificacao a cadastrar", largura: 14, opcoes: SIM_NAO },
    ],
    exemplo: [
      { tag: "VTP-VOT", descricao: "Planta Votorantim", nivel: "Planta", tagDoPai: "", planta: "Planta Votorantim", area: "Linha 4", tipo: "", criticidade: "Alta", fabricante: "", modelo: "", numeroDeSerie: "", calibravel: "Nao", lubrificavel: "Nao" },
      { tag: "VTP-VOT-L4", descricao: "Linha 4", nivel: "Area", tagDoPai: "VTP-VOT", planta: "", area: "", tipo: "", criticidade: "Alta", fabricante: "", modelo: "", numeroDeSerie: "", calibravel: "Nao", lubrificavel: "Nao" },
      { tag: "VTP-VOT-L4-CP01", descricao: "Compressor de ar", nivel: "Maquina", tagDoPai: "VTP-VOT-L4", planta: "", area: "", tipo: "Compressor de ar", criticidade: "Alta", fabricante: "Atlas Copco", modelo: "GA75", numeroDeSerie: "ACP-99120", calibravel: "Nao", lubrificavel: "Sim" },
    ],
  },
  {
    nome: "Mao de obra",
    descricao: "Quem executa as OS. O valor/hora alimenta o custo de manutencao por ativo - deixe em branco se nao quiser apurar custo.",
    colunas: [
      { chave: "nome", titulo: "Nome*", obrigatoria: true, ajuda: "Ex.: Joao da Silva", largura: 32 },
      { chave: "tipo", titulo: "Funcao*", obrigatoria: true, ajuda: "Do catalogo em Cadastros > Tipos de mao de obra. Funcao nova e' criada no catalogo ao importar.", largura: 24, lista: "funcoes" },
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
      { chave: "unidade", titulo: "Unidade", ajuda: "un, kg, g, m, L (padrao: un)", largura: 12, opcoes: UNIDADES },
      { chave: "saldoInicial", titulo: "Saldo inicial", ajuda: "Quantidade em estoque hoje. Numero inteiro.", largura: 14 },
      { chave: "estoqueMinimo", titulo: "Estoque minimo", ajuda: "Abaixo disso o sistema alerta", largura: 16 },
      { chave: "custoUnitario", titulo: "Custo unitario", ajuda: "Opcional. Numero. Ex.: 45.90", largura: 16 },
    ],
    exemplo: [{ nome: "Rolamento 6205", codigo: "PE-0001", categoria: "Rolamentos", unidade: "un", saldoInicial: 10, estoqueMinimo: 2, custoUnitario: 45.9 }],
  },
];

const AZUL = "FF0060C0";
const CINZA = "FFF1F3F5";

/** O que a empresa ja tem cadastrado, para as colunas virarem menu em vez de digitacao. */
export type ListasDoCliente = Partial<Record<ListaDinamica, string[]>>;

/** Limite do Excel para lista escrita direto na validacao. Acima disso, a lista precisa
 * morar numa aba e ser referenciada por intervalo - que e' o que fazemos sempre, para o
 * comportamento nao mudar conforme o tamanho do catalogo. */
const ABA_DE_LISTAS = "Listas";

export async function gerarPlanilhaModelo(nomeDaEmpresa?: string, listas: ListasDoCliente = {}): Promise<Buffer> {
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
    ["texto", "1. Preencha as abas na ordem em que aparecem: Plantas, Areas, Ativos, Mao de obra, Almoxarifado."],
    ["texto", "2. A ordem importa porque um registro depende do outro: a area precisa da planta, o ativo precisa da area, o componente precisa do ativo pai."],
    ["texto", "3. Colunas com * no titulo sao obrigatorias. As demais podem ficar em branco."],
    ["texto", "4. Colunas com lista fixa (Nivel, Criticidade, Calibravel, Lubrificavel, Unidade) e as que vem do seu cadastro (Planta, Area, Tipo, Funcao) tem menu suspenso na celula - clique na setinha em vez de digitar."],
    ["texto", "5. As referencias entre abas sao pelo NOME (ou pelo TAG, no caso de ativo pai) - escreva exatamente igual."],
    ["texto", "6. Nao renomeie as abas nem as colunas, e nao apague a linha de titulo."],
    ["texto", "7. Pode apagar as linhas de exemplo (elas vem em cinza) ou escrever por cima delas."],
    ["texto", "8. Aba que voce nao for usar pode ficar vazia - ela e' simplesmente ignorada."],
    ["vazio", ""],
    ["secao", "Ao enviar"],
    ["texto", "O sistema confere o arquivo inteiro ANTES de gravar qualquer coisa e mostra, linha a linha, o que estiver errado."],
    ["texto", "Nada e' importado enquanto voce nao confirmar."],
    ["vazio", ""],
    ["secao", "O que acontece com um ativo que JA existe"],
    ["texto", "A identidade do ativo e' o TAG (maiusculas/minusculas e espacos sobrando nao contam). Se o TAG ja estiver cadastrado, o ativo NAO e' duplicado."],
    ["texto", "Na conferencia, cada linha repetida aparece com os campos que estao diferentes do que ja esta no sistema - voce ve antes de decidir."],
    ["texto", "Ai voce escolhe: IGNORAR os repetidos (padrao, nao encosta em nada), ou COMPLETAR - que preenche apenas os campos hoje vazios no sistema."],
    ["texto", "Completar nunca troca um valor que ja existe: se o fabricante no sistema esta preenchido e diferente do da planilha, o do sistema fica."],
    ["texto", "O mesmo TAG repetido DENTRO da planilha e' erro, e nao importacao silenciosa da ultima linha."],
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

  // ── Aba de apoio com os valores aceitos ───────────────────────────────────
  // Fica oculta: serve ao menu suspenso das celulas, nao a quem preenche. Cada coluna com
  // valores fixos aponta para uma coluna daqui - digitar fora da lista passa a ser
  // recusado pelo proprio Excel, antes de o arquivo chegar no sistema.
  const listas_ws = wb.addWorksheet(ABA_DE_LISTAS, { state: "veryHidden" });
  const intervaloDaLista = new Map<string, string>();
  let colunaDeLista = 0;

  const registrarLista = (chave: string, valores: string[]) => {
    if (valores.length === 0 || intervaloDaLista.has(chave)) return;
    colunaDeLista += 1;
    const letra = listas_ws.getColumn(colunaDeLista).letter;
    listas_ws.getCell(`${letra}1`).value = chave;
    valores.forEach((valor, i) => {
      listas_ws.getCell(`${letra}${i + 2}`).value = valor;
    });
    intervaloDaLista.set(chave, `'${ABA_DE_LISTAS}'!$${letra}$2:$${letra}$${valores.length + 1}`);
  };

  for (const aba of ABAS) {
    for (const coluna of aba.colunas) {
      if (coluna.opcoes) registrarLista(`fixa:${coluna.chave}`, coluna.opcoes);
      if (coluna.lista) registrarLista(`cliente:${coluna.lista}`, listas[coluna.lista] ?? []);
    }
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

    // Menu suspenso nas colunas de valor fixo. Vale de sobra para o parque inteiro sem
    // deixar a planilha pesada, e nao trava quem preferir colar de outra planilha: o
    // sistema confere de novo na importacao.
    aba.colunas.forEach((coluna, i) => {
      const chave = coluna.opcoes ? `fixa:${coluna.chave}` : coluna.lista ? `cliente:${coluna.lista}` : null;
      const intervalo = chave ? intervaloDaLista.get(chave) : undefined;
      if (!intervalo) return;

      const letra = ws.getColumn(i + 1).letter;
      for (let linha = 2; linha <= 2000; linha += 1) {
        ws.getCell(`${letra}${linha}`).dataValidation = {
          type: "list",
          allowBlank: !coluna.obrigatoria,
          formulae: [intervalo],
          showErrorMessage: true,
          errorStyle: "warning",
          errorTitle: coluna.titulo.replace("*", ""),
          error: `Escolha um valor da lista. Aceitos: ${(coluna.opcoes ?? listas[coluna.lista!] ?? []).slice(0, 12).join(", ")}.`,
        };
      }
    });
  }

  const arquivo = await wb.xlsx.writeBuffer();
  return Buffer.from(arquivo as ArrayBuffer);
}
