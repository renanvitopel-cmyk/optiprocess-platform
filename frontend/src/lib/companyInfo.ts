// Conteudo institucional real da empresa (extraido dos documentos de apresentacao).
// Nome, logo e cores podem ser substituidos aqui e no tailwind.config.js quando a
// identidade visual definitiva estiver pronta.

export const company = {
  name: "OptiProcess",
  fullName: "OptiProcess Instalação, Manutenção Elétrica, Eletrônica e Instrumentação",
  address: "Rua Cuba, 212 - Vila Barcelona - Sorocaba/SP - CEP 18025-540",
  phoneDisplay: "(15) 99784-7299",
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
    title: "Manutenção Elétrica",
    shortDescription: "Instalação e manutenção elétrica predial e industrial, painéis e motores.",
    serviceCategory: "ELECTRICAL_MAINTENANCE",
    ctaLabel: "Orçar manutenção elétrica",
    items: [
      "Instalação e manutenção elétrica predial e industrial",
      "Instalação e montagem de painéis elétricos: distribuição, comando, automação, inversores",
      "Manutenção corretiva e preventiva de QGBT, CCM e banco de capacitores",
      "Manutenção preventiva em motores CA/CC: isolação, inspeção, reaperto e limpeza",
      "Instalação e comércio de carregadores para carros elétricos",
      "Mão de obra especializada por hora-homem",
    ],
  },
  {
    slug: "calibracao-instrumentacao",
    title: "Calibração e Instrumentação",
    shortDescription: "Calibração de temperatura, pressão e tempo com certificado rastreável.",
    serviceCategory: "CALIBRATION",
    ctaLabel: "Orçar calibração",
    items: [
      "Calibração de temperatura",
      "Calibração de pressão",
      "Calibração de tempo",
      "Certificados com cadeia de rastreabilidade metrológica e QR Code de validação pública",
      "Mão de obra técnica especializada por hora-homem",
    ],
  },
  {
    slug: "laudos-tecnicos",
    title: "Laudos Técnicos",
    shortDescription: "Laudos de instalações elétricas, termografia, aterramento e SPDA.",
    serviceCategory: "TECHNICAL_REPORT",
    ctaLabel: "Solicitar laudo técnico",
    items: [
      "Laudo de instalações elétricas",
      "Laudo de termografia infravermelha",
      "Laudo de aterramento elétrico",
      "Laudo de SPDA (sistema de proteção contra descargas atmosféricas - para-raios)",
    ],
  },
  {
    slug: "assistencia-tecnica",
    title: "Assistência Técnica",
    shortDescription: "Assistência técnica em equipamentos eletrônicos e inversores das principais marcas.",
    serviceCategory: "TECHNICAL_ASSISTANCE",
    ctaLabel: "Falar sobre assistência técnica",
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
    subtitle: "Software de gestão de manutenção por assinatura",
    shortDescription: "Plataforma completa para planejar, executar e controlar o custo da manutenção dos seus ativos.",
    serviceCategory: "CMMS_MAINTENANCE",
    ctaLabel: "Falar com um consultor",
    items: [
      "Árvore de ativos (pai/filho) com histórico completo por TAG",
      "Planos preventivos por tempo ou por medidor (horímetro, odômetro)",
      "Manutenção preditiva: leitura de sensor fora da faixa abre a ordem sozinha",
      "Ordens corretivas com checklist de execução e códigos de falha",
      "Almoxarifado de peças por empresa, com estoque mínimo e custo",
      "Mão de obra com valor/hora e custo real apurado por ordem",
      "Indicadores MTTR, MTBF, disponibilidade e cumprimento do plano",
      "Portal próprio: sua equipe usa o sistema sem depender da OptiProcess no dia a dia",
    ],
    benefits: [
      {
        title: "Menos parada não planejada",
        description: "Planos preventivos e alerta preditivo automático antecipam a falha antes que ela pare a produção.",
      },
      {
        title: "Custo de manutenção visível de verdade",
        description: "Cada ordem soma peça e mão de obra usada; a ficha do ativo mostra o gasto total, pra decidir manter ou trocar com dado, não com achismo.",
      },
      {
        title: "Nunca falta peça na hora certa",
        description: "Almoxarifado técnico próprio, com estoque mínimo por peça e alerta antes de faltar rolamento, retentor ou disjuntor.",
      },
      {
        title: "Sua equipe no controle",
        description: "Assinando o CMMS, sua própria equipe cadastra ativos, abre e executa ordens, controla estoque e mão de obra - sem depender de ligar pra OptiProcess pra cada passo.",
      },
      {
        title: "Sem letra miúda",
        description: "Assinatura mensal, sem instalar nada - acessa pelo navegador, no computador ou no celular, em qualquer lugar.",
      },
    ],
    integrations: [
      "Mesmo cadastro de ativo (TAG) usado na calibração - não duplica equipamento",
      "Certificados de calibração e laudos técnicos no mesmo portal da manutenção",
      "Ordens de serviço externas da OptiProcess e ordens internas do CMMS lado a lado",
      "Um único login pra toda a gestão técnica da empresa",
    ],
    controls: [
      "Preventiva por tempo (dias) ou por medidor (uso)",
      "Preditiva automática por limite de sensor/medidor",
      "Corretiva com checklist e código de falha",
      "Árvore de ativos e lista de peças compatíveis (BOM) por ativo",
      "Consumo de peça do almoxarifado direto na ordem, com baixa automática de estoque",
      "Lançamento de mão de obra por ordem, com valor/hora congelado no histórico",
      "Indicadores: MTTR, MTBF, disponibilidade, cumprimento do plano",
      "Anexos por ativo: manual do fabricante, fotos do equipamento",
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
