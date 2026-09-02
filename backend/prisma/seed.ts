/* eslint-disable no-console */
import { PrismaClient, Role, ClientStatus, ServiceCategory, ServiceOrderStatus, ServiceOrderItemType, InstrumentStatus, CalibrationResult, PointResult, DocumentStatus, TechnicalReportCategory, ContractStatus, ContractPeriodicity, ProductStatus, QuoteStatus, QuoteSource, OrderStatus, PaymentMethod, PaymentStatus, AttachmentEntityType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { getStorageProvider } from "../src/lib/storage";
import { generateTemporaryPassword } from "../src/lib/password";
import { env } from "../src/config/env";
import { buildCertificatePdf, defaultLogoPath } from "../src/lib/certificatePdf";
import { generateCertificateQrCode } from "../src/lib/qrcode";
import { COMPANY_INFO } from "../src/config/company";
import { nextDocumentNumber } from "../src/utils/sequence";

const prisma = new PrismaClient();

// Em producao nunca cria contas de demonstracao com senha fixa e previsivel
// (o codigo deste projeto e publico). Cada conta de demo ganha uma senha
// aleatoria, impressa uma unica vez ao final do seed.
const demoCredentials: { email: string; password: string }[] = [];

async function demoPasswordHashFor(email: string): Promise<string> {
  const password = env.isProduction ? generateTemporaryPassword() : "Demo@12345";
  if (env.isProduction) demoCredentials.push({ email, password });
  return bcrypt.hash(password, 12);
}

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

/** Gera um PDF minimo, porem valido (offsets de xref calculados), para servir de
 * anexo de demonstracao nos certificados/laudos semeados. */
function buildPlaceholderPdf(title: string, lines: string[]): Buffer {
  const escape = (s: string) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const content = [
    `BT /F1 18 Tf 72 740 Td (${escape(title)}) Tj ET`,
    ...lines.map((line, i) => `BT /F1 11 Tf 72 ${700 - i * 18} Td (${escape(line)}) Tj ET`),
  ].join("\n");

  const objects: Record<number, string> = {
    1: "<< /Type /Catalog /Pages 2 0 R >>",
    2: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    3: "<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >>",
    4: "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    5: `<< /Length ${Buffer.byteLength(content, "utf-8")} >>\nstream\n${content}\nendstream`,
  };

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (let i = 1; i <= 5; i++) {
    offsets[i] = Buffer.byteLength(pdf, "utf-8");
    pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefStart = Buffer.byteLength(pdf, "utf-8");
  pdf += `xref\n0 6\n0000000000 65535 f \n`;
  for (let i = 1; i <= 5; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return Buffer.from(pdf, "utf-8");
}

async function createPlaceholderAttachment(
  entityType: AttachmentEntityType,
  entityId: string,
  fileName: string,
  title: string,
  lines: string[],
): Promise<string> {
  const buffer = buildPlaceholderPdf(title, lines);
  const key = `${entityType.toLowerCase()}/${entityId}/${fileName}`;
  await getStorageProvider().upload(key, buffer, "application/pdf");
  const attachment = await prisma.attachment.create({
    data: { entityType, entityId, fileKey: key, fileName, mimeType: "application/pdf", sizeBytes: buffer.byteLength },
  });
  return attachment.id;
}

function monthsFromNow(months: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d;
}

async function seedRolesAndPermissions() {
  const permissionDefs = [
    { key: "clients.manage", label: "Gerenciar clientes", module: "Clientes" },
    { key: "clients.view", label: "Visualizar clientes", module: "Clientes" },
    { key: "service_orders.manage", label: "Gerenciar ordens de servico", module: "Ordens de servico" },
    { key: "instruments.manage", label: "Gerenciar instrumentos e calibracoes", module: "Calibracao" },
    { key: "reports.manage", label: "Gerenciar laudos tecnicos", module: "Laudos" },
    { key: "contracts.manage", label: "Gerenciar contratos", module: "Contratos" },
    { key: "products.manage", label: "Gerenciar produtos e estoque", module: "Produtos" },
    { key: "quotes.manage", label: "Gerenciar orcamentos e pedidos", module: "Comercial" },
    { key: "users.manage", label: "Gerenciar usuarios e permissoes", module: "Administracao" },
    { key: "audit.view", label: "Visualizar trilha de auditoria", module: "Administracao" },
    { key: "portal.own_data", label: "Acessar apenas os proprios dados", module: "Portal do cliente" },
  ];

  for (const p of permissionDefs) {
    await prisma.permission.upsert({ where: { key: p.key }, create: p, update: p });
  }

  const roleDefs: { key: Role; label: string; description: string; permissionKeys: string[] }[] = [
    {
      key: "ADMIN",
      label: "Administrador",
      description: "Acesso completo ao sistema, usuarios, configuracoes, clientes, laudos, produtos, estoque, pedidos e relatorios.",
      permissionKeys: permissionDefs.map((p) => p.key),
    },
    {
      key: "TECHNICIAN",
      label: "Tecnico",
      description: "Cadastra e atualiza ordens de servico, instrumentos, calibracoes, laudos e anexos. Sem acesso a usuarios ou configuracoes.",
      permissionKeys: ["clients.view", "service_orders.manage", "instruments.manage", "reports.manage"],
    },
    {
      key: "COMMERCIAL",
      label: "Comercial",
      description: "Gerencia clientes, propostas, catalogo, produtos, estoque, pedidos e status comerciais.",
      permissionKeys: ["clients.manage", "contracts.manage", "products.manage", "quotes.manage"],
    },
    {
      key: "CLIENT",
      label: "Cliente",
      description: "Acessa apenas a propria empresa: instrumentos, laudos, certificados, ordens de servico, contratos, pedidos e documentos.",
      permissionKeys: ["portal.own_data"],
    },
  ];

  for (const r of roleDefs) {
    const role = await prisma.roleDefinition.upsert({
      where: { key: r.key },
      create: { key: r.key, label: r.label, description: r.description },
      update: { label: r.label, description: r.description },
    });
    for (const permKey of r.permissionKeys) {
      const permission = await prisma.permission.findUniqueOrThrow({ where: { key: permKey } });
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        create: { roleId: role.id, permissionId: permission.id },
        update: {},
      });
    }
  }
}

async function seedUsers() {
  const admin = await prisma.user.upsert({
    where: { email: process.env.INITIAL_ADMIN_EMAIL?.toLowerCase() ?? "admin@optiprocess.com.br" },
    create: {
      name: process.env.INITIAL_ADMIN_NAME ?? "Administrador OptiProcess",
      email: (process.env.INITIAL_ADMIN_EMAIL ?? "admin@optiprocess.com.br").toLowerCase(),
      passwordHash: process.env.INITIAL_ADMIN_PASSWORD
        ? await bcrypt.hash(process.env.INITIAL_ADMIN_PASSWORD, 12)
        : await demoPasswordHashFor("admin@optiprocess.com.br"),
      role: "ADMIN",
    },
    update: {},
  });

  const technician = await prisma.user.upsert({
    where: { email: "rodnei@optiprocess.com.br" },
    create: {
      name: "Rodnei Fernandes",
      email: "rodnei@optiprocess.com.br",
      passwordHash: await demoPasswordHashFor("rodnei@optiprocess.com.br"),
      role: "TECHNICIAN",
    },
    update: {},
  });

  const technician2 = await prisma.user.upsert({
    where: { email: "tecnico2@optiprocess.com.br" },
    create: {
      name: "Marcos Silva",
      email: "tecnico2@optiprocess.com.br",
      passwordHash: await demoPasswordHashFor("tecnico2@optiprocess.com.br"),
      role: "TECHNICIAN",
    },
    update: {},
  });

  const commercial = await prisma.user.upsert({
    where: { email: "comercial@optiprocess.com.br" },
    create: {
      name: "Ana Paula Souza",
      email: "comercial@optiprocess.com.br",
      passwordHash: await demoPasswordHashFor("comercial@optiprocess.com.br"),
      role: "COMMERCIAL",
    },
    update: {},
  });

  return { admin, technician, technician2, commercial };
}

interface SeedClientDef {
  companyName: string;
  tradeName: string | undefined;
  cnpj: string;
  stateRegistration: string | undefined;
  addressStreet: string | undefined;
  addressNumber: string | undefined;
  addressDistrict: string | undefined;
  addressCity: string | undefined;
  addressState: string | undefined;
  addressZip: string | undefined;
  phone: string | undefined;
  whatsapp: string | undefined;
  email: string | undefined;
  technicalContactName: string | undefined;
  commercialContactName: string | undefined;
  status: ClientStatus;
  contractedServices: ServiceCategory[];
  loginEmail: string | undefined;
}

async function seedClients() {
  const clientsData: SeedClientDef[] = [
    {
      companyName: "Metalurgica Vale do Sorocaba Ltda",
      tradeName: "Metalvale",
      cnpj: "12.345.678/0001-90",
      stateRegistration: "123.456.789.112",
      addressStreet: "Av. Independencia",
      addressNumber: "1500",
      addressDistrict: "Jardim Santa Rosalia",
      addressCity: "Sorocaba",
      addressState: "SP",
      addressZip: "18087-120",
      phone: "(15) 3222-1010",
      whatsapp: "5515988887777",
      email: "manutencao@metalvale.com.br",
      technicalContactName: "Eng. Paulo Henrique",
      commercialContactName: "Fernanda Lima",
      status: ClientStatus.ACTIVE,
      contractedServices: [ServiceCategory.CALIBRATION, ServiceCategory.ELECTRICAL_MAINTENANCE, ServiceCategory.TECHNICAL_REPORT],
      loginEmail: "portal@metalvale.com.br",
    },
    {
      companyName: "Laticinios Campo Verde S.A.",
      tradeName: "Campo Verde",
      cnpj: "23.456.789/0001-01",
      stateRegistration: "234.567.891.113",
      addressStreet: "Rod. Raposo Tavares, km 98",
      addressNumber: "s/n",
      addressDistrict: "Distrito Industrial",
      addressCity: "Votorantim",
      addressState: "SP",
      addressZip: "18110-000",
      phone: "(15) 3344-2020",
      whatsapp: "5515988886666",
      email: "engenharia@campoverde.com.br",
      technicalContactName: "Eng. Camila Rocha",
      commercialContactName: "Bruno Alves",
      status: ClientStatus.ACTIVE,
      contractedServices: [ServiceCategory.CALIBRATION, ServiceCategory.PANEL_MAINTENANCE],
      loginEmail: "portal@campoverde.com.br",
    },
    {
      companyName: "Plasticos Sorocaba Industrial Ltda",
      tradeName: "Plastisoc",
      cnpj: "34.567.891/0001-12",
      stateRegistration: "345.678.912.114",
      addressStreet: "Rua das Industrias",
      addressNumber: "780",
      addressDistrict: "Eden",
      addressCity: "Sorocaba",
      addressState: "SP",
      addressZip: "18103-330",
      phone: "(15) 3255-3030",
      whatsapp: "5515988885555",
      email: "manutencao@plastisoc.com.br",
      technicalContactName: "Ricardo Nogueira",
      commercialContactName: "Juliana Prado",
      status: ClientStatus.ACTIVE,
      contractedServices: [ServiceCategory.CALIBRATION, ServiceCategory.TECHNICAL_ASSISTANCE, ServiceCategory.MOTOR_MAINTENANCE],
      loginEmail: "portal@plastisoc.com.br",
    },
    {
      companyName: "AutoPecas Rodovia SP Comercio Ltda",
      tradeName: "AutoPecas Rodovia",
      cnpj: "45.678.912/0001-23",
      stateRegistration: undefined,
      addressStreet: undefined,
      addressNumber: undefined,
      addressDistrict: undefined,
      addressCity: "Itu",
      addressState: "SP",
      addressZip: undefined,
      phone: "(11) 4022-4040",
      whatsapp: undefined,
      email: "contato@autopecasrodovia.com.br",
      technicalContactName: undefined,
      commercialContactName: undefined,
      status: ClientStatus.PROSPECT,
      contractedServices: [ServiceCategory.EV_CHARGER],
      loginEmail: undefined,
    },
    {
      companyName: "Textil Itavema Confeccoes Ltda",
      tradeName: "Itavema Textil",
      cnpj: "56.789.123/0001-34",
      stateRegistration: undefined,
      addressStreet: undefined,
      addressNumber: undefined,
      addressDistrict: undefined,
      addressCity: "Sorocaba",
      addressState: "SP",
      addressZip: undefined,
      phone: "(15) 3266-5050",
      whatsapp: undefined,
      email: "financeiro@itavematextil.com.br",
      technicalContactName: undefined,
      commercialContactName: undefined,
      status: ClientStatus.INACTIVE,
      contractedServices: [],
      loginEmail: undefined,
    },
  ];

  const clients = [];
  for (const c of clientsData) {
    const { loginEmail, ...clientFields } = c;
    const client = await prisma.client.upsert({
      where: { cnpj: c.cnpj },
      create: clientFields,
      update: {},
    });
    clients.push(client);

    if (loginEmail) {
      await prisma.user.upsert({
        where: { email: loginEmail },
        create: {
          name: c.commercialContactName ?? c.tradeName ?? c.companyName,
          email: loginEmail,
          passwordHash: await demoPasswordHashFor(loginEmail),
          role: "CLIENT",
          clientId: client.id,
        },
        update: { clientId: client.id },
      });
    }

    const existingContact = await prisma.clientContact.findFirst({ where: { clientId: client.id, isPrimary: true } });
    if (!existingContact) {
      await prisma.clientContact.create({
        data: {
          clientId: client.id,
          name: c.technicalContactName ?? c.commercialContactName ?? "Contato principal",
          role: c.technicalContactName ? "Responsavel tecnico" : "Responsavel comercial",
          email: c.email,
          phone: c.phone,
          isPrimary: true,
        },
      });
    }
  }

  return clients;
}

async function seedInstruments(clients: Awaited<ReturnType<typeof seedClients>>) {
  const instrumentDefs = [
    { client: clients[0], type: "Termometro industrial", tag: "TI-001", manufacturer: "Gefran", model: "600", serialNumber: "GF60012345", unit: "°C", months: 12, lastCal: -60 },
    { client: clients[0], type: "Transmissor de pressao", tag: "PT-014", manufacturer: "Gefran", model: "KX1", serialNumber: "GFKX198877", unit: "bar", months: 12, lastCal: -340 },
    { client: clients[1], type: "Termometro de processo", tag: "TE-102", manufacturer: "WEG", model: "TH200", serialNumber: "WEG20211", unit: "°C", months: 6, lastCal: -170 },
    { client: clients[1], type: "Cronometro industrial", tag: "CR-007", manufacturer: "Extech", model: "CT30", serialNumber: "EXT300099", unit: "s", months: 12, lastCal: -20 },
    { client: clients[2], type: "Manometro digital", tag: "MN-055", manufacturer: "Gefran", model: "MD30", serialNumber: "GFMD305566", unit: "bar", months: 12, lastCal: -370 },
    { client: clients[2], type: "Termopar tipo K", tag: "TP-009", manufacturer: "Siemens", model: "TK-9", serialNumber: "SIE900123", unit: "°C", months: 12, lastCal: -10 },
  ];

  const instruments = [];
  for (const def of instrumentDefs) {
    const lastCalibrationDate = daysFromNow(def.lastCal);
    const nextDueDate = new Date(lastCalibrationDate);
    nextDueDate.setMonth(nextDueDate.getMonth() + def.months);

    const status: InstrumentStatus =
      nextDueDate < new Date() ? "EXPIRED" : nextDueDate < daysFromNow(30) ? "DUE_SOON" : "VALID";

    const instrument = await prisma.instrument.create({
      data: {
        clientId: def.client.id,
        type: def.type,
        tag: def.tag,
        manufacturer: def.manufacturer,
        model: def.model,
        serialNumber: def.serialNumber,
        unit: def.unit,
        calibrationFrequencyMonths: def.months,
        lastCalibrationDate,
        nextDueDate,
        status,
      },
    });
    instruments.push(instrument);
  }
  return instruments;
}

async function seedCalibrations(
  instruments: Awaited<ReturnType<typeof seedInstruments>>,
  technicianId: string,
) {
  let counter = 1;
  for (const instrument of instruments) {
    const calibrationDate = instrument.lastCalibrationDate ?? daysFromNow(-30);
    const certificateNumber = await nextDocumentNumber("calibration", calibrationDate);
    counter += 1;

    const calibration = await prisma.calibration.create({
      data: {
        certificateNumber,
        clientId: instrument.clientId,
        instrumentId: instrument.id,
        calibrationDate,
        location: "Instalações do cliente",
        technicianId,
        procedure: "IT-CAL-001 - Comparação direta com padrão de referência",
        coverageFactorK: 2,
        ambientTemperature: 23.5,
        ambientHumidity: 55,
        result: CalibrationResult.APPROVED,
        technicalConclusion:
          "Instrumento aprovado. Os erros encontrados permanecem dentro da tolerância especificada em todos os " +
          "pontos verificados, considerando a incerteza de medição declarada.",
        observations: "Instrumento em boas condições de uso, sem sinais de desgaste ou avaria.",
        validUntil: instrument.nextDueDate ?? daysFromNow(300),
        issuedAt: calibrationDate,
        status: DocumentStatus.ISSUED,
        visibleToClient: true,
        standards: {
          create: [
            {
              description: "Calibrador multifunção de referência",
              manufacturer: "Presys",
              model: "T-25N",
              serialNumber: "PR25N-004512",
              certificateNumber: `RBC-${2000 + counter}/2026`,
              certificateValidUntil: daysFromNow(240),
              laboratory: "RBC - Rede Brasileira de Calibração",
              sortOrder: 0,
            },
          ],
        },
        points: {
          create: [
            { standardValue: 0, indicatedValue: 0.1, error: 0.1, tolerance: 0.5, uncertainty: 0.05, result: PointResult.PASS, sortOrder: 0 },
            { standardValue: 50, indicatedValue: 50.2, error: 0.2, tolerance: 0.5, uncertainty: 0.05, result: PointResult.PASS, sortOrder: 1 },
            { standardValue: 100, indicatedValue: 99.8, error: -0.2, tolerance: 0.5, uncertainty: 0.05, result: PointResult.PASS, sortOrder: 2 },
          ],
        },
      },
    });

    // Gera o certificado com o mesmo motor usado em producao - assim os dados de
    // demonstracao ja saem no formato real do documento.
    const full = await prisma.calibration.findUniqueOrThrow({
      where: { id: calibration.id },
      include: {
        client: true,
        instrument: true,
        technician: { select: { id: true, name: true } },
        points: { orderBy: { sortOrder: "asc" } },
        standards: { orderBy: { sortOrder: "asc" } },
      },
    });

    const qr = await generateCertificateQrCode(full.qrCodeToken);
    const pdf = await buildCertificatePdf({
      calibration: full,
      photos: [],
      qrCodeDataUrl: qr.dataUrl,
      validationUrl: qr.url,
      company: COMPANY_INFO,
      logoPath: defaultLogoPath(),
    });

    const key = `calibrations/${calibration.id}/certificado-${Date.now()}.pdf`;
    await getStorageProvider().upload(key, pdf, "application/pdf");
    const attachment = await prisma.attachment.create({
      data: {
        entityType: AttachmentEntityType.CALIBRATION,
        entityId: calibration.id,
        category: "DOCUMENT",
        caption: "Certificado de calibração",
        fileKey: key,
        fileName: `${certificateNumber}.pdf`,
        mimeType: "application/pdf",
        sizeBytes: pdf.byteLength,
      },
    });
    await prisma.calibration.update({ where: { id: calibration.id }, data: { pdfAttachmentId: attachment.id } });
  }
}

async function seedTechnicalReports(clients: Awaited<ReturnType<typeof seedClients>>, responsibleId: string) {
  const defs = [
    { client: clients[0], category: TechnicalReportCategory.ELECTRICAL_INSTALLATION, location: "Subestacao principal" },
    { client: clients[0], category: TechnicalReportCategory.THERMOGRAPHY, location: "Painel QGBT" },
    { client: clients[1], category: TechnicalReportCategory.GROUNDING, location: "Area industrial" },
    { client: clients[2], category: TechnicalReportCategory.SPDA, location: "Cobertura do galpao" },
  ];

  let counter = 1;
  for (const def of defs) {
    const reportDate = daysFromNow(-30 * counter);
    const number = await nextDocumentNumber("technicalReport", reportDate);
    const report = await prisma.technicalReport.create({
      data: {
        number,
        category: def.category,
        clientId: def.client.id,
        location: def.location,
        responsibleId,
        reportDate,
        validUntil: monthsFromNow(12),
        status: DocumentStatus.ISSUED,
        visibleToClient: true,
        observations: "Relatorio elaborado conforme normas tecnicas vigentes (NBR 5410 / NBR 5419).",
      },
    });

    const attachmentId = await createPlaceholderAttachment(
      AttachmentEntityType.TECHNICAL_REPORT,
      report.id,
      `${number}.pdf`,
      `Laudo Tecnico ${number}`,
      [
        `Categoria: ${def.category}`,
        `Local: ${def.location}`,
        `Data: ${reportDate.toLocaleDateString("pt-BR")}`,
        "Documento de demonstracao gerado pelo seed - substitua pelo PDF real do laudo.",
      ],
    );
    await prisma.technicalReport.update({ where: { id: report.id }, data: { pdfAttachmentId: attachmentId } });
    counter += 1;
  }
}

async function seedServiceOrders(
  clients: Awaited<ReturnType<typeof seedClients>>,
  technicianId: string,
) {
  const statuses: ServiceOrderStatus[] = ["BUDGET", "APPROVED", "SCHEDULED", "IN_PROGRESS", "COMPLETED"];
  let counter = 1;
  for (const client of clients.slice(0, 3)) {
    for (const status of statuses.slice(0, 3)) {
      const order = await prisma.serviceOrder.create({
        data: {
          number: await nextDocumentNumber("serviceOrder"),
          clientId: client.id,
          siteAddress: `${client.addressStreet ?? "Endereco do cliente"}, ${client.addressCity ?? "Sorocaba"}/${client.addressState ?? "SP"}`,
          category: ServiceCategory.ELECTRICAL_MAINTENANCE,
          description: "Manutencao preventiva em painel de distribuicao e verificacao de aterramento.",
          technicianId,
          scheduledDate: daysFromNow(counter * 3),
          deadline: daysFromNow(counter * 3 + 2),
          laborHours: 4,
          status,
        },
      });
      await prisma.serviceOrderItem.createMany({
        data: [
          { serviceOrderId: order.id, type: ServiceOrderItemType.CHECKLIST, description: "Verificar torque dos contatos", done: status === "COMPLETED" },
          { serviceOrderId: order.id, type: ServiceOrderItemType.CHECKLIST, description: "Medir isolacao dos circuitos", done: status === "COMPLETED" },
          { serviceOrderId: order.id, type: ServiceOrderItemType.MATERIAL, description: "Terminal de conexao 4mm", quantity: 10, unit: "un" },
        ],
      });
      counter += 1;
    }
  }
}

async function seedContracts(clients: Awaited<ReturnType<typeof seedClients>>, responsibleId: string) {
  await prisma.serviceContract.create({
    data: {
      clientId: clients[0].id,
      serviceName: "Manutencao eletrica preventiva mensal",
      startDate: daysFromNow(-180),
      endDate: monthsFromNow(6),
      value: 3500,
      periodicity: ContractPeriodicity.MONTHLY,
      responsibleId,
      status: ContractStatus.ACTIVE,
    },
  });
  await prisma.serviceContract.create({
    data: {
      clientId: clients[1].id,
      serviceName: "Calibracao semestral de instrumentos",
      startDate: daysFromNow(-90),
      endDate: daysFromNow(20),
      value: 2200,
      periodicity: ContractPeriodicity.SEMIANNUAL,
      responsibleId,
      status: ContractStatus.ACTIVE,
    },
  });
}

async function seedProducts() {
  const categoriesData = [
    { name: "Materiais Eletricos", slug: "materiais-eletricos" },
    { name: "Automacao", slug: "automacao" },
    { name: "Instrumentacao", slug: "instrumentacao" },
    { name: "Inversores", slug: "inversores" },
    { name: "Carregadores Veiculares", slug: "carregadores-veiculares" },
  ];

  const categories: Record<string, string> = {};
  for (const c of categoriesData) {
    const created = await prisma.productCategory.upsert({ where: { slug: c.slug }, create: c, update: {} });
    categories[c.slug] = created.id;
  }

  const productsData: {
    name: string;
    sku: string;
    category: string;
    brand: string;
    price: number | null;
    priceOnRequest: boolean;
    stockQty: number;
    minStock: number;
    featured: boolean;
  }[] = [
    { name: "Sinaleiro LED 22mm Vermelho", sku: "SIN-LED-22-VM", category: "materiais-eletricos", brand: "Generico", price: 18.9, priceOnRequest: false, stockQty: 120, minStock: 20, featured: false },
    { name: "Botao de Comando 22mm Verde", sku: "BOT-CMD-22-VD", category: "materiais-eletricos", brand: "Generico", price: 22.5, priceOnRequest: false, stockQty: 80, minStock: 15, featured: false },
    { name: "Contator Tripolar 25A", sku: "CTT-25A-3P", category: "materiais-eletricos", brand: "WEG", price: 145.0, priceOnRequest: false, stockQty: 30, minStock: 10, featured: false },
    { name: "Rele Termico 9-13A", sku: "RTE-09-13A", category: "materiais-eletricos", brand: "WEG", price: 98.0, priceOnRequest: false, stockQty: 8, minStock: 10, featured: false },
    { name: "Controlador de Temperatura Gefran 600", sku: "GEF-CTRL-600", category: "instrumentacao", brand: "Gefran", price: null, priceOnRequest: true, stockQty: 12, minStock: 5, featured: false },
    { name: "Transdutor de Pressao Gefran KX1", sku: "GEF-KX1", category: "instrumentacao", brand: "Gefran", price: null, priceOnRequest: true, stockQty: 6, minStock: 5, featured: false },
    { name: "Sensor de Posicao Gefran LT", sku: "GEF-LT-POS", category: "automacao", brand: "Gefran", price: null, priceOnRequest: true, stockQty: 4, minStock: 3, featured: false },
    { name: "Inversor de Frequencia WEG CFW300", sku: "WEG-CFW300", category: "inversores", brand: "WEG", price: 1890.0, priceOnRequest: false, stockQty: 5, minStock: 2, featured: true },
    { name: "Carregador Veicular WEG WEMOB 7kW", sku: "WEG-WEMOB-7KW", category: "carregadores-veiculares", brand: "WEG", price: 4590.0, priceOnRequest: false, stockQty: 3, minStock: 2, featured: true },
    { name: "Plug Industrial 3P+T 32A", sku: "PLG-3PT-32A", category: "materiais-eletricos", brand: "Generico", price: 65.0, priceOnRequest: false, stockQty: 40, minStock: 10, featured: false },
  ];

  const products = [];
  for (const p of productsData) {
    const { category, ...rest } = p;
    const product = await prisma.product.upsert({
      where: { sku: p.sku },
      create: {
        ...rest,
        slug: p.sku.toLowerCase(),
        categoryId: categories[category],
        status: ProductStatus.ACTIVE,
        description: `${p.name} - produto ${p.brand ?? "profissional"} para uso industrial.`,
      },
      update: {},
    });
    products.push(product);
  }
  return products;
}

async function seedQuotesAndOrders(clients: Awaited<ReturnType<typeof seedClients>>, products: Awaited<ReturnType<typeof seedProducts>>) {
  const quote = await prisma.quote.create({
    data: {
      number: await nextDocumentNumber("quote"),
      clientId: clients[0].id,
      source: QuoteSource.PRODUCT_CART,
      status: QuoteStatus.QUOTE_SENT,
      contactName: "Fernanda Lima",
      contactEmail: "manutencao@metalvale.com.br",
      contactPhone: "(15) 98888-7777",
      items: {
        create: [
          { productId: products[2].id, quantity: 5, unitPriceRequested: 145, unitPriceOffered: 138 },
          { productId: products[9].id, quantity: 10, unitPriceRequested: 65, unitPriceOffered: 60 },
        ],
      },
    },
  });

  await prisma.quote.create({
    data: {
      number: await nextDocumentNumber("quote"),
      source: QuoteSource.SERVICE_REQUEST,
      status: QuoteStatus.NEW,
      contactName: "Jose Ricardo",
      contactEmail: "jose.ricardo@exemplo.com.br",
      contactPhone: "(15) 99999-1234",
      serviceCategory: ServiceCategory.CALIBRATION,
      message: "Preciso de calibracao de 3 manometros e 2 termometros para auditoria ISO 9001.",
    },
  });

  await prisma.order.create({
    data: {
      number: await nextDocumentNumber("order"),
      clientId: clients[1].id,
      status: OrderStatus.SEPARATED,
      totalAmount: 680,
      shippingCost: 0,
      paymentMethod: PaymentMethod.PIX,
      paymentStatus: PaymentStatus.PAID,
      items: { create: [{ productId: products[1].id, quantity: 20, unitPrice: 22.5, subtotal: 450 }, { productId: products[0].id, quantity: 10, unitPrice: 18.9, subtotal: 189 }] },
      statusHistory: { create: [{ status: OrderStatus.PENDING, note: "Pedido criado" }, { status: OrderStatus.SEPARATED, note: "Itens separados no estoque" }] },
    },
  });

  void quote;
}

async function main() {
  console.log("Iniciando seed...");
  await seedRolesAndPermissions();
  const { technician, commercial } = await seedUsers();
  const clients = await seedClients();
  const instruments = await seedInstruments(clients);
  await seedCalibrations(instruments, technician.id);
  await seedTechnicalReports(clients, technician.id);
  await seedServiceOrders(clients, technician.id);
  await seedContracts(clients, commercial.id);
  const products = await seedProducts();
  await seedQuotesAndOrders(clients, products);
  console.log("Seed concluido com sucesso.");

  if (demoCredentials.length > 0) {
    console.log("\nSenhas de demonstracao geradas (producao) - anote agora, nao serao mostradas de novo:");
    for (const cred of demoCredentials) {
      console.log(`  ${cred.email}  ->  ${cred.password}`);
    }
    console.log("");
  }
}

main()
  .catch((error) => {
    console.error("Erro ao executar seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
