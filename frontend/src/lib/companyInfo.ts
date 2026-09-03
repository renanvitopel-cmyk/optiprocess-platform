// Conteudo institucional real da empresa (extraido dos documentos de apresentacao).
// Nome, logo e cores podem ser substituidos aqui e no tailwind.config.js quando a
// identidade visual definitiva estiver pronta.

export const company = {
  name: "OptiProcess",
  fullName: "OptiProcess Instalacao, Manutencao Eletrica, Eletronica e Instrumentacao",
  address: "Rua Cuba, 212 - Vila Barcelona - Sorocaba/SP - CEP 18025-540",
  phoneDisplay: "(15) 99784-7299",
  email: "contatooptprocess@gmail.com",
  mission:
    "Prover solucoes inovadoras em servicos eletricos, instrumentacao, manutencao eletrica preventiva e corretiva, assegurando a maxima disponibilidade e seguranca das instalacoes industriais e comerciais, com foco na excelencia tecnica e na satisfacao do cliente.",
  vision:
    "Consolidar-se como a parceira tecnologica de referencia no setor industrial e comercial, tornando-se a primeira escolha para solucoes de manutencao eletrica, destacando-se pela excelencia operacional, seguranca absoluta e capacidade de atender as necessidades do mercado.",
};

export interface Differential {
  title: string;
  description: string;
}

export const differentials: Differential[] = [
  {
    title: "Seguranca em primeiro lugar",
    description: "Compromisso inabalavel com a preservacao da vida, a saude ocupacional e o cumprimento rigoroso das normas de seguranca.",
  },
  {
    title: "Excelencia tecnica",
    description: "Busca continua pela qualidade superior em todos os servicos, com rigor tecnico e atualizacao constante do conhecimento.",
  },
  {
    title: "Etica e transparencia",
    description: "Conducao dos negocios com honestidade e clareza em todas as interacoes, de orcamentos a comunicacao de riscos.",
  },
  {
    title: "Comprometimento",
    description: "Responsabilidade com prazos, qualidade dos resultados e resolucao proativa de problemas criticos do cliente.",
  },
  {
    title: "Sustentabilidade",
    description: "Praticas que minimizam o impacto ambiental e promovem o uso eficiente da energia.",
  },
  {
    title: "Inovacao",
    description: "Estimulo a novas tecnologias e metodologias que otimizem processos e aumentem a seguranca.",
  },
];

export interface ServiceLine {
  slug: string;
  title: string;
  shortDescription: string;
  items: string[];
  // Campos extras (opcionais) para servicos que sao plataforma/assinatura, nao so
  // execucao pontual - so o CMMS usa por enquanto, os outros continuam so com "items".
  subtitle?: string;
  benefits?: { title: string; description: string }[];
  integrations?: string[];
  controls?: string[];
}

export const serviceLines: ServiceLine[] = [
  {
    slug: "manutencao-eletrica",
    title: "Manutencao Eletrica",
    shortDescription: "Instalacao e manutencao eletrica predial e industrial, paineis e motores.",
    items: [
      "Instalacao e manutencao eletrica predial e industrial",
      "Instalacao e montagem de paineis eletricos: distribuicao, comando, automacao, inversores",
      "Manutencao corretiva e preventiva de QGBT, CCM e banco de capacitores",
      "Manutencao preventiva em motores CA/CC: isolacao, inspecao, reaperto e limpeza",
      "Instalacao e comercio de carregadores para carros eletricos",
      "Mao de obra especializada por hora-homem",
    ],
  },
  {
    slug: "calibracao-instrumentacao",
    title: "Calibracao e Instrumentacao",
    shortDescription: "Calibracao de temperatura, pressao e tempo com certificado rastreavel.",
    items: [
      "Calibracao de temperatura",
      "Calibracao de pressao",
      "Calibracao de tempo",
      "Certificados com rastreabilidade e QR Code de validacao publica",
      "Mao de obra tecnica especializada por hora-homem",
    ],
  },
  {
    slug: "laudos-tecnicos",
    title: "Laudos Tecnicos",
    shortDescription: "Laudos de instalacoes eletricas, termografia, aterramento e SPDA.",
    items: [
      "Laudo de instalacoes eletricas",
      "Laudo de termografia infravermelha",
      "Laudo de aterramento eletrico",
      "Laudo de SPDA (sistema de protecao contra descargas atmosfericas - para-raios)",
    ],
  },
  {
    slug: "assistencia-tecnica",
    title: "Assistencia Tecnica",
    shortDescription: "Assistencia tecnica em equipamentos eletronicos e inversores das principais marcas.",
    items: [
      "Inversores Siemens",
      "Inversores WEG",
      "Equipamentos Fanuc",
      "Equipamentos Mitsubishi",
      "Equipamentos Bosch/Rexroth",
    ],
  },
  {
    slug: "rlp-maintenance-cmms",
    title: "RLP Maintenance CMMS",
    subtitle: "Software de gestao de manutencao por assinatura",
    shortDescription: "Plataforma completa para planejar, executar e controlar o custo da manutencao dos seus ativos.",
    items: [
      "Arvore de ativos (pai/filho) com historico completo por TAG",
      "Planos preventivos por tempo ou por medidor (horimetro, odometro)",
      "Manutencao preditiva: leitura de sensor fora da faixa abre a ordem sozinha",
      "Ordens corretivas com checklist de execucao e codigos de falha",
      "Almoxarifado de pecas por empresa, com estoque minimo e custo",
      "Mao de obra com valor/hora e custo real apurado por ordem",
      "Indicadores MTTR, MTBF, disponibilidade e cumprimento do plano",
      "Portal proprio: sua equipe usa o sistema sem depender da OptiProcess no dia a dia",
    ],
    benefits: [
      {
        title: "Menos parada nao planejada",
        description: "Planos preventivos e alerta preditivo automatico antecipam a falha antes que ela pare a producao.",
      },
      {
        title: "Custo de manutencao visivel de verdade",
        description: "Cada ordem soma peca e mao de obra usada; a ficha do ativo mostra o gasto total, pra decidir manter ou trocar com dado, nao com achismo.",
      },
      {
        title: "Nunca falta peca na hora certa",
        description: "Almoxarifado tecnico proprio, com estoque minimo por peca e alerta antes de faltar rolamento, retentor ou disjuntor.",
      },
      {
        title: "Sua equipe no controle",
        description: "Assinando o CMMS, sua propria equipe cadastra ativos, abre e executa ordens, controla estoque e mao de obra - sem depender de ligar pra OptiProcess pra cada passo.",
      },
      {
        title: "Sem letra miuda",
        description: "Assinatura mensal, sem instalar nada - acessa pelo navegador, no computador ou no celular, em qualquer lugar.",
      },
    ],
    integrations: [
      "Mesmo cadastro de ativo (TAG) usado na calibracao - nao duplica equipamento",
      "Certificados de calibracao e laudos tecnicos no mesmo portal da manutencao",
      "Ordens de servico externas da OptiProcess e ordens internas do CMMS lado a lado",
      "Um unico login pra toda a gestao tecnica da empresa",
    ],
    controls: [
      "Preventiva por tempo (dias) ou por medidor (uso)",
      "Preditiva automatica por limite de sensor/medidor",
      "Corretiva com checklist e codigo de falha",
      "Arvore de ativos e lista de pecas compativeis (BOM) por ativo",
      "Consumo de peca do almoxarifado direto na ordem, com baixa automatica de estoque",
      "Lancamento de mao de obra por ordem, com valor/hora congelado no historico",
      "Indicadores: MTTR, MTBF, disponibilidade, cumprimento do plano",
      "Anexos por ativo: manual do fabricante, fotos do equipamento",
    ],
  },
];

export const productHighlights = [
  "Sinaleiros e lampadas de sinalizacao",
  "Botoeiras, contatores e reles termicos",
  "Plugs industriais",
  "Linha completa Gefran do Brasil (controladores, transdutores, sensores)",
  "Carregadores veiculares WEG WEMOB",
];
