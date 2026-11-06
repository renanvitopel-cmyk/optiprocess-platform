// Conteudo institucional real da empresa (extraido dos documentos de apresentacao).
// Nome, logo e cores podem ser substituidos aqui e no tailwind.config.js quando a
// identidade visual definitiva estiver pronta.

export const company = {
  name: "OptiProcess",
  fullName: "OptiProcess Instalação, Manutenção Elétrica, Eletrônica e Instrumentação",
  address: "Rua Cuba, 212 - Vila Barcelona - Sorocaba/SP - CEP 18025-540",
  phoneDisplay: "(15) 99119-8557",
  email: "contatooptprocess@gmail.com",
  mission:
    "Prover soluções inovadoras em serviços elétricos, instrumentação, manutenção elétrica preventiva e corretiva, assegurando a máxima disponibilidade e segurança das instalações industriais e comerciais, com foco na excelência técnica e na satisfação do cliente.",
  vision:
    "Consolidar-se como a parceira tecnológica de referência no setor industrial e comercial, tornando-se a primeira escolha para soluções de manutenção elétrica, destacando-se pela excelência operacional, segurança absoluta e capacidade de atender às necessidades do mercado.",
};

export interface Differential {
  title: string;
  description: string;
}

export const differentials: Differential[] = [
  {
    title: "Segurança em primeiro lugar",
    description: "Compromisso inabalável com a preservação da vida, a saúde ocupacional e o cumprimento rigoroso das normas de segurança.",
  },
  {
    title: "Excelência técnica",
    description: "Busca contínua pela qualidade superior em todos os serviços, com rigor técnico e atualização constante do conhecimento.",
  },
  {
    title: "Ética e transparência",
    description: "Condução dos negócios com honestidade e clareza em todas as interações, de orçamentos a comunicação de riscos.",
  },
  {
    title: "Comprometimento",
    description: "Responsabilidade com prazos, qualidade dos resultados e resolução proativa de problemas críticos do cliente.",
  },
  {
    title: "Sustentabilidade",
    description: "Práticas que minimizam o impacto ambiental e promovem o uso eficiente da energia.",
  },
  {
    title: "Inovação",
    description: "Estímulo a novas tecnologias e metodologias que otimizem processos e aumentem a segurança.",
  },
];

export interface ServiceLine {
  slug: string;
  title: string;
  shortDescription: string;
  items: string[];
  // Categoria correspondente em ServiceCategory (backend) - usada pra pre-preencher
  // o formulario de orcamento com o servico certo, em vez do usuario escolher de novo.
  serviceCategory: string;
  // Texto do botao de orcamento especifico deste servico (em vez do generico "Solicitar orcamento").
  ctaLabel: string;
  // Destino do botao quando nao e' o formulario de orcamento (ex.: material vai pro catalogo).
  ctaTo?: string;
}

// Somente as frentes da descricao padrao da empresa (OPTI_Descricao_Padrao.docx, 05/11/2026).
// Assistencia tecnica, SPDA e o RLP Maintenance CMMS sairam do site por decisao da empresa.
export const serviceLines: ServiceLine[] = [
  {
    slug: "manutencao-eletrica",
    title: "Instalação e Manutenção Elétrica",
    shortDescription: "Instalação e manutenção elétrica predial, comercial e industrial.",
    serviceCategory: "ELECTRICAL_MAINTENANCE",
    ctaLabel: "Orçar manutenção elétrica",
    items: [
      "Instalação e manutenção elétrica predial, comercial e industrial",
      "Instalação, montagem e manutenção corretiva e preventiva em painéis elétricos de distribuição, comando, automação e acionamento/inversores",
      "Painéis QGBT e CCM",
      "Instalação de carregador elétrico veicular – Integrador WEG",
      "Mão de obra especializada elétrica e eletrônica (H/H)",
    ],
  },
  {
    slug: "calibracao-instrumentacao",
    title: "Calibração e Instrumentação",
    shortDescription: "Calibração e instrumentação industrial e comercial: temperatura, pressão e tempo.",
    serviceCategory: "CALIBRATION",
    ctaLabel: "Orçar calibração",
    items: [
      "Calibração de temperatura",
      "Calibração de pressão",
      "Calibração de tempo",
      "Certificados com cadeia de rastreabilidade metrológica e QR Code de validação pública",
    ],
  },
  {
    slug: "laudos-tecnicos",
    title: "Inspeção e Laudos",
    shortDescription: "Inspeção e laudos de instalações elétricas, aterramento, termografia, subestação e mais.",
    serviceCategory: "TECHNICAL_REPORT",
    ctaLabel: "Solicitar inspeção ou laudo",
    items: [
      "Instalações elétricas",
      "Aterramento elétrico",
      "Termografia",
      "Banco de capacitores",
      "Motores elétricos CA/CC",
      "Subestação",
      "Transformadores",
    ],
  },
  {
    slug: "material-eletrico",
    title: "Material Elétrico e Instrumentação",
    shortDescription: "Material elétrico, eletrônico, de automação e de instrumentação.",
    serviceCategory: "OTHER",
    ctaLabel: "Ver catálogo de produtos",
    ctaTo: "/produtos",
    items: [
      "Material elétrico",
      "Material eletrônico",
      "Automação",
      "Instrumentação",
    ],
  },
];

export const productHighlights = [
  "Sinaleiros e lâmpadas de sinalização",
  "Botoeiras, contatores e relés térmicos",
  "Plugs industriais",
  "Linha completa Gefran do Brasil (controladores, transdutores, sensores)",
  "Carregadores veiculares WEG WEMOB",
];
