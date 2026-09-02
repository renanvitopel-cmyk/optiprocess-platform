import PDFDocument from "pdfkit";
import path from "node:path";
import { existsSync } from "node:fs";
import type {
  Calibration,
  CalibrationPoint,
  CalibrationStandard,
  Client,
  Instrument,
  User,
} from "@prisma/client";

/**
 * Monta o Certificado de Calibracao da OptiProcess.
 *
 * Estrutura pensada para um certificado profissional: identificacao do emissor e
 * do cliente, dados do item calibrado, condicoes ambientais, padroes com cadeia
 * de rastreabilidade, tabela de pontos com erro/incerteza/tolerancia, declaracao
 * de incerteza, conclusao, registro fotografico e assinatura do responsavel.
 *
 * Embute o Roboto (Apache 2.0) em vez de usar as fontes padrao do PDF: com
 * Helvetica, o PDFKit nao renderiza os caracteres nao-ASCII do portugues -
 * acentos, "°C" e "±" saem corrompidos, o que e inaceitavel num certificado.
 */

export interface CertificateData {
  calibration: Calibration & {
    client: Client;
    instrument: Instrument;
    technician: Pick<User, "id" | "name">;
    points: CalibrationPoint[];
    standards: CalibrationStandard[];
  };
  /** Fotos ja baixadas do storage, na ordem em que devem aparecer. */
  photos: { buffer: Buffer; caption: string }[];
  /** QR Code de validacao publica, como data URL PNG. */
  qrCodeDataUrl: string;
  validationUrl: string;
  company: {
    name: string;
    fullName: string;
    address: string;
    phone: string;
    email: string;
  };
  logoPath?: string;
}

const NAVY = "#13223c";
const GRAPHITE = "#4a505c";
const LIGHT = "#e5e7ea";
const BLUE = "#0060c0";
const GREEN = "#0b7a44";
const RED = "#d93025";
const AMBER = "#c99000";

const MARGIN = 42;
const PAGE_WIDTH = 595.28; // A4
const CONTENT_W = PAGE_WIDTH - MARGIN * 2;

// Nomes registrados no documento; ver registerFonts().
const FONT = "body";
const FONT_BOLD = "body-bold";

/** Localiza os TTF embutidos, tanto rodando via tsx (src) quanto compilado (dist). */
function fontPath(file: string): string {
  const candidates = [
    path.resolve(__dirname, "../../assets/fonts", file), // dist/lib -> backend/assets
    path.resolve(__dirname, "../../../assets/fonts", file),
    path.resolve(process.cwd(), "assets/fonts", file),
    path.resolve(process.cwd(), "backend/assets/fonts", file),
  ];
  return candidates.find((p) => existsSync(p)) ?? "";
}

/** Registra o Roboto; se os arquivos faltarem, cai para Helvetica (ASCII apenas). */
function registerFonts(doc: PDFKit.PDFDocument): void {
  const regular = fontPath("Roboto-Regular.ttf");
  const bold = fontPath("Roboto-Bold.ttf");
  if (regular && bold) {
    doc.registerFont(FONT, regular);
    doc.registerFont(FONT_BOLD, bold);
  } else {
    console.warn("Fontes Roboto nao encontradas; PDF sairá com Helvetica e acentos podem falhar.");
    doc.registerFont(FONT, "Helvetica");
    doc.registerFont(FONT_BOLD, "Helvetica-Bold");
  }
}

const RESULT_LABELS: Record<string, string> = {
  APPROVED: "APROVADO",
  APPROVED_WITH_RESTRICTION: "APROVADO COM RESSALVA",
  REJECTED: "REPROVADO",
};

const RESULT_COLORS: Record<string, string> = {
  APPROVED: GREEN,
  APPROVED_WITH_RESTRICTION: AMBER,
  REJECTED: RED,
};

const CATEGORY_LABELS: Record<string, string> = {
  LOCATION: "Local da calibração",
  INSTRUMENT: "Instrumento calibrado",
  STANDARD: "Padrão utilizado",
  MEASUREMENT: "Leituras / medições",
  DOCUMENT: "Documento",
  OTHER: "Registro",
};

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function num(v: number | null | undefined, digits = 3): string {
  if (v === null || v === undefined) return "-";
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: digits });
}

export function buildCertificatePdf(data: CertificateData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: MARGIN, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    registerFonts(doc);

    const { calibration: cal, company, photos, qrCodeDataUrl, validationUrl } = data;
    const instrument = cal.instrument;
    const client = cal.client;

    // ---------------------------------------------------------------- cabecalho
    let y = MARGIN;
    if (data.logoPath && existsSync(data.logoPath)) {
      try {
        doc.image(data.logoPath, MARGIN, y, { fit: [116, 52] });
      } catch {
        // logo ausente/corrompido nao pode impedir a emissao do certificado
      }
    }

    doc.font(FONT_BOLD).fontSize(15).fillColor(NAVY);
    doc.text("CERTIFICADO DE CALIBRAÇÃO", MARGIN + 130, y + 4, { width: CONTENT_W - 130, align: "right" });
    doc.font(FONT).fontSize(8.5).fillColor(GRAPHITE);
    doc.text(company.fullName, MARGIN + 130, y + 24, { width: CONTENT_W - 130, align: "right" });
    doc.text(`${company.address}`, MARGIN + 130, y + 35, { width: CONTENT_W - 130, align: "right" });
    doc.text(`${company.phone}  |  ${company.email}`, MARGIN + 130, y + 46, {
      width: CONTENT_W - 130,
      align: "right",
    });

    y += 66;
    doc.moveTo(MARGIN, y).lineTo(MARGIN + CONTENT_W, y).lineWidth(1.6).strokeColor(BLUE).stroke();
    y += 12;

    // Faixa com numero do certificado e resultado
    const resultLabel = RESULT_LABELS[cal.result] ?? cal.result;
    const resultColor = RESULT_COLORS[cal.result] ?? GRAPHITE;
    doc.roundedRect(MARGIN, y, CONTENT_W, 34, 4).fillColor("#f4f5f6").fill();
    doc.font(FONT_BOLD).fontSize(13).fillColor(NAVY);
    doc.text(`Nº ${cal.certificateNumber}`, MARGIN + 12, y + 7);
    doc.font(FONT).fontSize(8).fillColor(GRAPHITE);
    doc.text(`Revisão ${cal.revisionNumber}`, MARGIN + 12, y + 22);
    doc.font(FONT_BOLD).fontSize(12).fillColor(resultColor);
    doc.text(resultLabel, MARGIN, y + 11, { width: CONTENT_W - 12, align: "right" });
    y += 46;

    // ------------------------------------------------------------- utilitarios
    const sectionTitle = (title: string) => {
      if (y > 720) {
        doc.addPage();
        y = MARGIN;
      }
      doc.font(FONT_BOLD).fontSize(9.5).fillColor("#ffffff");
      doc.rect(MARGIN, y, CONTENT_W, 17).fillColor(NAVY).fill();
      doc.fillColor("#ffffff").text(title.toUpperCase(), MARGIN + 8, y + 4.5);
      y += 24;
    };

    /** Grade de rotulo/valor. cols = quantas colunas por linha. */
    const fieldGrid = (fields: { label: string; value: string }[], cols = 3) => {
      const colW = CONTENT_W / cols;
      let i = 0;
      while (i < fields.length) {
        const row = fields.slice(i, i + cols);
        let rowH = 0;
        row.forEach((f, c) => {
          const x = MARGIN + c * colW;
          doc.font(FONT).fontSize(7).fillColor(GRAPHITE);
          doc.text(f.label.toUpperCase(), x, y, { width: colW - 10 });
          doc.font(FONT_BOLD).fontSize(9).fillColor("#22252b");
          const h = doc.heightOfString(f.value, { width: colW - 10 });
          doc.text(f.value, x, y + 10, { width: colW - 10 });
          rowH = Math.max(rowH, 10 + h);
        });
        y += rowH + 9;
        i += cols;
        if (y > 740) {
          doc.addPage();
          y = MARGIN;
        }
      }
    };

    /** Tabela generica com cabecalho e larguras proporcionais. */
    const table = (
      headers: string[],
      rows: string[][],
      widths: number[],
      colColors?: (row: string[]) => string | undefined,
    ) => {
      const total = widths.reduce((a, b) => a + b, 0);
      const w = widths.map((x) => (x / total) * CONTENT_W);

      const drawHeader = () => {
        doc.rect(MARGIN, y, CONTENT_W, 16).fillColor(NAVY).fill();
        doc.font(FONT_BOLD).fontSize(7.5).fillColor("#ffffff");
        let x = MARGIN;
        headers.forEach((h, i) => {
          doc.text(h.toUpperCase(), x + 5, y + 4.5, { width: w[i] - 8 });
          x += w[i];
        });
        y += 16;
      };

      drawHeader();
      rows.forEach((row, ri) => {
        const cellH = Math.max(
          ...row.map((c, i) => doc.font(FONT).fontSize(8).heightOfString(c, { width: w[i] - 8 })),
        );
        const rowH = cellH + 8;
        if (y + rowH > 780) {
          doc.addPage();
          y = MARGIN;
          drawHeader();
        }
        if (ri % 2 === 1) {
          doc.rect(MARGIN, y, CONTENT_W, rowH).fillColor("#f7f8f9").fill();
        }
        let x = MARGIN;
        const highlight = colColors?.(row);
        row.forEach((c, i) => {
          const isLast = i === row.length - 1;
          doc
            .font(isLast && highlight ? FONT_BOLD : FONT)
            .fontSize(8)
            .fillColor(isLast && highlight ? highlight : "#22252b");
          doc.text(c, x + 5, y + 4, { width: w[i] - 8 });
          x += w[i];
        });
        doc.moveTo(MARGIN, y + rowH).lineTo(MARGIN + CONTENT_W, y + rowH).lineWidth(0.4).strokeColor(LIGHT).stroke();
        y += rowH;
      });
      y += 12;
    };

    // -------------------------------------------------------------- 1. cliente
    sectionTitle("1. Cliente");
    fieldGrid(
      [
        { label: "Razão social", value: client.companyName },
        { label: "CNPJ", value: client.cnpj || "-" },
        { label: "Cidade / UF", value: [client.addressCity, client.addressState].filter(Boolean).join("/") || "-" },
      ],
      3,
    );

    // ------------------------------------------------------ 2. item calibrado
    sectionTitle("2. Item calibrado");
    fieldGrid(
      [
        { label: "Instrumento", value: instrument.type },
        { label: "Fabricante", value: instrument.manufacturer },
        { label: "Modelo", value: instrument.model },
        { label: "Nº de série", value: instrument.serialNumber },
        { label: "Tag / Patrimônio", value: instrument.tag || "-" },
        { label: "Faixa de medição", value: instrument.measurementRange || "-" },
        { label: "Resolução", value: instrument.resolution || "-" },
        { label: "Unidade", value: instrument.unit || "-" },
        { label: "Local de instalação", value: instrument.installationLocation || "-" },
      ],
      3,
    );

    // ------------------------------------------------------- 3. dados da calib.
    sectionTitle("3. Dados da calibração");
    fieldGrid(
      [
        { label: "Data da calibração", value: fmtDate(cal.calibrationDate) },
        { label: "Data de emissão", value: fmtDate(cal.issuedAt ?? new Date()) },
        { label: "Validade", value: fmtDate(cal.validUntil) },
        { label: "Local da calibração", value: cal.location },
        { label: "Periodicidade", value: `${instrument.calibrationFrequencyMonths} meses` },
        { label: "Responsável técnico", value: cal.technician.name },
        { label: "Temperatura ambiente", value: cal.ambientTemperature != null ? `${num(cal.ambientTemperature, 1)} °C` : "-" },
        { label: "Umidade relativa", value: cal.ambientHumidity != null ? `${num(cal.ambientHumidity, 1)} %` : "-" },
        { label: "Método / procedimento", value: cal.procedure || "-" },
      ],
      3,
    );
    if (cal.environmentalNotes) {
      doc.font(FONT).fontSize(8).fillColor(GRAPHITE);
      doc.text(`Observações ambientais: ${cal.environmentalNotes}`, MARGIN, y, { width: CONTENT_W });
      y += doc.heightOfString(`Observações ambientais: ${cal.environmentalNotes}`, { width: CONTENT_W }) + 10;
    }

    // ------------------------------------------------ 4. padroes/rastreabilidade
    sectionTitle("4. Padrões utilizados e rastreabilidade");
    if (cal.standards.length > 0) {
      table(
        ["Padrão", "Fabricante / Modelo", "Nº de série", "Certificado", "Validade", "Laboratório"],
        cal.standards.map((s) => [
          s.description,
          [s.manufacturer, s.model].filter(Boolean).join(" / ") || "-",
          s.serialNumber || "-",
          s.certificateNumber || "-",
          fmtDate(s.certificateValidUntil),
          s.laboratory || "-",
        ]),
        [22, 20, 14, 16, 12, 16],
      );
    } else {
      fieldGrid(
        [
          { label: "Padrão utilizado", value: cal.standardUsed || "-" },
          { label: "Rastreabilidade", value: cal.traceability || "-" },
        ],
        2,
      );
    }

    // --------------------------------------------------- 5. resultados/pontos
    sectionTitle("5. Resultados da calibração");
    const unit = instrument.unit ? ` (${instrument.unit})` : "";
    table(
      [
        `Valor padrão${unit}`,
        `Valor indicado${unit}`,
        `Erro${unit}`,
        `Tolerância${unit}`,
        `Incerteza${unit}`,
        "Resultado",
      ],
      cal.points.map((p) => [
        num(p.standardValue),
        num(p.indicatedValue),
        num(p.error),
        `± ${num(p.tolerance)}`,
        `± ${num(p.uncertainty)}`,
        p.result === "PASS" ? "Aprovado" : "Reprovado",
      ]),
      [17, 17, 15, 17, 17, 17],
      (row) => (row[5] === "Aprovado" ? GREEN : RED),
    );

    doc.font(FONT).fontSize(7.5).fillColor(GRAPHITE);
    const kText =
      `A incerteza de medição declarada corresponde à incerteza expandida, obtida a partir da incerteza ` +
      `padrão combinada multiplicada pelo fator de abrangência k = ${num(cal.coverageFactorK ?? 2, 2)}, ` +
      `para um nível de confiança de aproximadamente 95%. Os resultados referem-se exclusivamente ao item ` +
      `calibrado, nas condições indicadas neste certificado.`;
    doc.text(kText, MARGIN, y, { width: CONTENT_W, align: "justify" });
    y += doc.heightOfString(kText, { width: CONTENT_W }) + 14;

    // ------------------------------------------------------------ 6. conclusao
    sectionTitle("6. Conclusão técnica");
    doc.roundedRect(MARGIN, y, CONTENT_W, 3, 1).fillColor(resultColor).fill();
    y += 10;
    doc.font(FONT_BOLD).fontSize(10).fillColor(resultColor);
    doc.text(`Resultado final: ${resultLabel}`, MARGIN, y);
    y += 16;
    doc.font(FONT).fontSize(9).fillColor("#22252b");
    doc.text(cal.technicalConclusion, MARGIN, y, { width: CONTENT_W, align: "justify" });
    y += doc.heightOfString(cal.technicalConclusion, { width: CONTENT_W }) + 10;

    if (cal.observations) {
      doc.font(FONT_BOLD).fontSize(8).fillColor(GRAPHITE).text("Observações", MARGIN, y);
      y += 12;
      doc.font(FONT).fontSize(9).fillColor("#22252b");
      doc.text(cal.observations, MARGIN, y, { width: CONTENT_W, align: "justify" });
      y += doc.heightOfString(cal.observations, { width: CONTENT_W }) + 10;
    }

    // ----------------------------------------------- 7. assinatura + validacao
    // O bloco (QR + assinatura) ocupa ~110px; so quebra a pagina se realmente nao couber.
    if (y > 660) {
      doc.addPage();
      y = MARGIN;
    }
    y += 12;
    const qrSize = 78;
    const qrX = MARGIN + CONTENT_W - qrSize;
    try {
      const qrBuf = Buffer.from(qrCodeDataUrl.split(",")[1] ?? "", "base64");
      if (qrBuf.length > 0) doc.image(qrBuf, qrX, y, { fit: [qrSize, qrSize] });
    } catch {
      // QR e um reforco de autenticidade; sua ausencia nao invalida o documento
    }
    doc.font(FONT).fontSize(6.5).fillColor(GRAPHITE);
    doc.text("Valide a autenticidade em:", qrX - 150, y + 20, { width: 145, align: "right" });
    doc.fillColor(BLUE).text(validationUrl, qrX - 150, y + 30, { width: 145, align: "right" });

    const sigY = y + 46;
    doc.moveTo(MARGIN, sigY).lineTo(MARGIN + 210, sigY).lineWidth(0.8).strokeColor(GRAPHITE).stroke();
    doc.font(FONT_BOLD).fontSize(9).fillColor(NAVY);
    doc.text(cal.technician.name, MARGIN, sigY + 5, { width: 210 });
    doc.font(FONT).fontSize(7.5).fillColor(GRAPHITE);
    doc.text("Responsável técnico", MARGIN, sigY + 17, { width: 210 });
    doc.text(company.name, MARGIN, sigY + 27, { width: 210 });
    y = sigY + 50;

    // ------------------------------------------------- 8. registro fotografico
    if (photos.length > 0) {
      doc.addPage();
      y = MARGIN;
      sectionTitle("Anexo - Registro fotográfico");

      const gap = 12;
      const imgW = (CONTENT_W - gap) / 2;
      const imgH = imgW * 0.72;
      let col = 0;

      for (const photo of photos) {
        if (y + imgH + 26 > 780) {
          doc.addPage();
          y = MARGIN;
          col = 0;
        }
        const x = MARGIN + col * (imgW + gap);
        try {
          doc.save();
          doc.roundedRect(x, y, imgW, imgH, 3).clip();
          doc.image(photo.buffer, x, y, { cover: [imgW, imgH], align: "center", valign: "center" });
          doc.restore();
          doc.roundedRect(x, y, imgW, imgH, 3).lineWidth(0.6).strokeColor(LIGHT).stroke();
        } catch {
          doc.restore();
          doc.roundedRect(x, y, imgW, imgH, 3).fillColor("#f4f5f6").fill();
        }
        doc.font(FONT).fontSize(7.5).fillColor(GRAPHITE);
        doc.text(photo.caption, x, y + imgH + 4, { width: imgW });

        col += 1;
        if (col === 2) {
          col = 0;
          y += imgH + 26;
        }
      }
      if (col === 1) y += imgH + 26;
    }

    // ------------------------------------------------------ rodape de todas as paginas
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      // Sem zerar a margem inferior, o PDFKit entende que o rodape nao cabe na
      // area util e cria uma pagina nova para cada rodape escrito.
      doc.page.margins.bottom = 0;
      const footY = 800;
      doc.moveTo(MARGIN, footY).lineTo(MARGIN + CONTENT_W, footY).lineWidth(0.5).strokeColor(LIGHT).stroke();
      doc.font(FONT).fontSize(6.5).fillColor(GRAPHITE);
      doc.text(
        `${company.name}  |  Certificado ${cal.certificateNumber} (rev. ${cal.revisionNumber})  |  ` +
          `Emitido em ${fmtDate(cal.issuedAt ?? new Date())}`,
        MARGIN,
        footY + 6,
        { width: CONTENT_W - 60 },
      );
      doc.text(`Pág. ${i + 1}/${range.count}`, MARGIN, footY + 6, { width: CONTENT_W, align: "right" });
    }

    doc.end();
  });
}

export function defaultLogoPath(): string {
  // O PDF e gerado no servidor; em producao o build do front fica em frontend/dist.
  const candidates = [
    path.resolve(__dirname, "../../../frontend/dist/brand/logo-full.png"),
    path.resolve(__dirname, "../../../frontend/public/brand/logo-full.png"),
  ];
  return candidates.find((p) => existsSync(p)) ?? "";
}

export { CATEGORY_LABELS };
