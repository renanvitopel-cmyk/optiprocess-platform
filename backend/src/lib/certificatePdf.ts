import PDFDocument from "pdfkit";
import path from "node:path";
import { existsSync } from "node:fs";
import type {
  Calibration,
  CalibrationPoint,
  CalibrationReading,
  CalibrationStandard,
  Client,
  Instrument,
  User,
} from "@prisma/client";

/**
 * Monta o Certificado de Calibracao da OptiProcess.
 *
 * Layout de laudo de bancada: cabecalho com logo e numero, cliente em linhas de
 * rotulo/valor, quadro do item calibrado, itens numerados (condicoes ambientais,
 * procedimento, padroes, notas, resultados, conclusao), datas + QR Code + assinatura
 * e o quadro do emissor no fim. Marca-d'agua discreta do simbolo em todas as paginas.
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
    points: (CalibrationPoint & { readings: CalibrationReading[] })[];
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
const INK = "#22252b";
const LIGHT = "#e5e7ea";
const BORDER = "#c9d3e0";
const TINT = "#eef2f8";
const ZEBRA = "#f6f8fb";
const BLUE = "#0060c0";
const GREEN = "#0b7a44";
const RED = "#d93025";
const AMBER = "#c99000";

const MARGIN = 42;
const PAGE_WIDTH = 595.28; // A4
const CONTENT_W = PAGE_WIDTH - MARGIN * 2;
/** Ultima linha util; abaixo disso fica o rodape (linha em 800). */
const BOTTOM = 786;

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

/** Legenda padrao das fotos do anexo, por categoria (usada tambem no controller). */
export const CATEGORY_LABELS: Record<string, string> = {
  LOCATION: "Local da calibração",
  INSTRUMENT: "Instrumento calibrado",
  STANDARD: "Padrão utilizado",
  MEASUREMENT: "Leituras / medições",
  DOCUMENT: "Documento",
  OTHER: "Registro",
};

/** Datas sem hora (calibracao, validade) chegam de um campo de data e ficam a meia-noite
 * UTC; no fuso de Sao Paulo isso caia no dia anterior. Meia-noite UTC exata e' data pura
 * e sai em UTC; um horario real (ex.: issuedAt) continua no fuso de Sao Paulo. */
function fmtDate(d: Date | null | undefined): string {
  if (!d) return "-";
  const date = new Date(d);
  const dateOnly =
    date.getUTCHours() === 0 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0 && date.getUTCMilliseconds() === 0;
  return date.toLocaleDateString("pt-BR", { timeZone: dateOnly ? "UTC" : "America/Sao_Paulo" });
}

function num(v: number | null | undefined, digits = 3): string {
  if (v === null || v === undefined) return "-";
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: digits });
}

/** Endereco do cliente numa linha so, pulando o que nao foi cadastrado. */
function clientAddress(c: Client): string {
  const rua = [c.addressStreet, c.addressNumber].filter(Boolean).join(", ");
  const cidade = [c.addressCity, c.addressState].filter(Boolean).join("/");
  const partes = [rua, c.addressComplement, c.addressDistrict, cidade, c.addressZip ? `CEP ${c.addressZip}` : null];
  return partes.filter(Boolean).join(" - ") || "-";
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
    const resultLabel = RESULT_LABELS[cal.result] ?? cal.result;
    const resultColor = RESULT_COLORS[cal.result] ?? GRAPHITE;
    const unit = instrument.unit ? ` (${instrument.unit})` : "";

    let y = MARGIN;

    // ------------------------------------------------------------- utilitarios
    const newPage = () => {
      doc.addPage();
      y = MARGIN;
    };
    /** Garante espaco para um bloco de altura h; senao abre outra pagina. */
    const ensure = (h: number) => {
      if (y + h > BOTTOM) newPage();
    };

    /** "Rotulo: valor" na mesma linha, rotulo em negrito. Devolve a altura usada. */
    const labelValue = (label: string, value: string, x: number, width: number, size = 8.5) => {
      doc.font(FONT_BOLD).fontSize(size);
      const h = doc.heightOfString(`${label} ${value}`, { width });
      doc.fillColor(NAVY).text(`${label} `, x, y, { width, continued: true });
      doc.font(FONT).fillColor(INK).text(value, { width });
      return h;
    };

    /** Titulo de item numerado ("1- Condicoes ambientais:") com o texto logo em seguida. */
    const numbered = (n: number, title: string, text?: string) => {
      const head = `${n}- ${title}:`;
      doc.font(FONT_BOLD).fontSize(9);
      const h = doc.heightOfString(text ? `${head} ${text}` : head, { width: CONTENT_W });
      ensure(h + 4);
      if (text) {
        doc.fillColor(NAVY).text(`${head} `, MARGIN, y, { width: CONTENT_W, continued: true });
        doc.font(FONT).fontSize(8.5).fillColor(INK).text(text, { width: CONTENT_W });
      } else {
        doc.fillColor(NAVY).text(head, MARGIN, y, { width: CONTENT_W });
      }
      y += h + 5;
    };

    /** Item de lista com marcador, recuado sob o titulo numerado. */
    const bullet = (text: string, size = 7.5) => {
      const x = MARGIN + 12;
      const w = CONTENT_W - 12;
      doc.font(FONT).fontSize(size);
      const h = doc.heightOfString(text, { width: w });
      ensure(h + 2);
      doc.circle(MARGIN + 6, y + size * 0.55, 1.2).fillColor(BLUE).fill();
      doc.fillColor(GRAPHITE).text(text, x, y, { width: w, align: "justify" });
      y += h + 2.5;
    };

    /**
     * Tabela de cabecalho claro, linhas zebradas e borda arredondada. Na quebra de pagina
     * fecha a borda do trecho atual e repete o cabecalho no topo da pagina seguinte.
     * align: alinhamento por coluna; colColor: cor da celula (ex.: resultado do ponto).
     */
    const table = (
      headers: string[],
      rows: string[][],
      widths: number[],
      opts: { align?: ("left" | "center")[]; colColor?: (row: string[], col: number) => string | undefined } = {},
    ) => {
      const total = widths.reduce((a, b) => a + b, 0);
      const w = widths.map((x) => (x / total) * CONTENT_W);
      const alignOf = (i: number) => opts.align?.[i] ?? "left";

      doc.font(FONT_BOLD).fontSize(7);
      const headerH = Math.max(18, ...headers.map((h, i) => doc.heightOfString(h, { width: w[i] - 8 }) + 9));
      let segmentTop = y;

      const closeSegment = () => {
        doc.roundedRect(MARGIN, segmentTop, CONTENT_W, y - segmentTop, 5).lineWidth(0.7).strokeColor(BORDER).stroke();
      };
      const drawHeader = () => {
        segmentTop = y;
        doc.save();
        doc.roundedRect(MARGIN, y, CONTENT_W, headerH + 5, 5).clip();
        doc.rect(MARGIN, y, CONTENT_W, headerH).fillColor(TINT).fill();
        doc.restore();
        doc.font(FONT_BOLD).fontSize(7).fillColor(NAVY);
        let x = MARGIN;
        headers.forEach((h, i) => {
          const th = doc.heightOfString(h, { width: w[i] - 8 });
          doc.text(h, x + 4, y + (headerH - th) / 2, { width: w[i] - 8, align: alignOf(i) });
          x += w[i];
        });
        y += headerH;
        doc.moveTo(MARGIN, y).lineTo(MARGIN + CONTENT_W, y).lineWidth(0.7).strokeColor(BORDER).stroke();
      };

      ensure(headerH + 20);
      drawHeader();
      rows.forEach((row, ri) => {
        doc.font(FONT).fontSize(8);
        const cellH = Math.max(...row.map((c, i) => doc.heightOfString(c, { width: w[i] - 8 })));
        const rowH = cellH + 7;
        if (y + rowH > BOTTOM) {
          closeSegment();
          newPage();
          drawHeader();
        }
        if (ri % 2 === 1) doc.rect(MARGIN + 0.5, y, CONTENT_W - 1, rowH).fillColor(ZEBRA).fill();
        let x = MARGIN;
        row.forEach((c, i) => {
          const color = opts.colColor?.(row, i);
          doc.font(color ? FONT_BOLD : FONT).fontSize(8).fillColor(color ?? INK);
          doc.text(c, x + 4, y + 3.5, { width: w[i] - 8, align: alignOf(i) });
          x += w[i];
        });
        y += rowH;
      });
      closeSegment();
      y += 10;
    };

    // ---------------------------------------------------------------- cabecalho
    const logoBoxW = 150;
    const logoBoxH = 58;
    doc.roundedRect(MARGIN, y, logoBoxW, logoBoxH, 6).lineWidth(0.9).strokeColor(BORDER).stroke();
    if (data.logoPath && existsSync(data.logoPath)) {
      try {
        doc.image(data.logoPath, MARGIN + 10, y + 6, { fit: [logoBoxW - 20, logoBoxH - 12], align: "center", valign: "center" });
      } catch {
        // logo ausente/corrompido nao pode impedir a emissao do certificado
      }
    }

    const headX = MARGIN + logoBoxW + 16;
    const headW = CONTENT_W - logoBoxW - 16;
    doc.font(FONT_BOLD).fontSize(15).fillColor(NAVY);
    doc.text("CERTIFICADO DE CALIBRAÇÃO", headX, y + 2, { width: headW, align: "right" });
    doc.font(FONT_BOLD).fontSize(11).fillColor(BLUE);
    doc.text(`Nº ${cal.certificateNumber}`, headX, y + 22, { width: headW, align: "right" });
    doc.font(FONT).fontSize(7.5).fillColor(GRAPHITE);
    doc.text(`Revisão ${cal.revisionNumber}  •  Emitido em ${fmtDate(cal.issuedAt ?? new Date())}`, headX, y + 36, {
      width: headW,
      align: "right",
    });
    // Selo do resultado: o que o cliente procura primeiro no documento.
    doc.font(FONT_BOLD).fontSize(8);
    const sealW = doc.widthOfString(resultLabel) + 18;
    const sealX = MARGIN + CONTENT_W - sealW;
    doc.roundedRect(sealX, y + 46, sealW, 15, 7.5).lineWidth(1).strokeColor(resultColor).stroke();
    doc.fillColor(resultColor).text(resultLabel, sealX, y + 50, { width: sealW, align: "center" });
    y += logoBoxH + 14;

    // ------------------------------------------------------------------ cliente
    const colLabelW = CONTENT_W;
    const clientName = client.tradeName && client.tradeName !== client.companyName
      ? `${client.companyName} (${client.tradeName})`
      : client.companyName;
    y += labelValue("Cliente:", clientName, MARGIN, colLabelW) + 3;
    if (client.cnpj) y += labelValue("CNPJ:", client.cnpj, MARGIN, colLabelW) + 3;
    y += labelValue("Endereço:", clientAddress(client), MARGIN, colLabelW) + 3;
    if (client.technicalContactName) y += labelValue("Contato técnico:", client.technicalContactName, MARGIN, colLabelW) + 3;
    y += 5;
    doc.moveTo(MARGIN, y).lineTo(MARGIN + CONTENT_W, y).lineWidth(1.4).strokeColor(NAVY).stroke();
    y += 10;

    // ------------------------------------------------------------ item calibrado
    const left: [string, string][] = [
      ["Instrumento:", instrument.type],
      ["Identificação / TAG:", instrument.tag || "-"],
      ["Faixa de medição:", instrument.measurementRange || "-"],
      ["Resolução:", instrument.resolution || "-"],
      ["Local de instalação:", instrument.installationLocation || "-"],
    ];
    const right: [string, string][] = [
      ["Fabricante:", instrument.manufacturer || "-"],
      ["Modelo:", instrument.model || "-"],
      ["Nº de série:", instrument.serialNumber || "-"],
      ["Unidade:", instrument.unit || "-"],
      [
        "Periodicidade:",
        instrument.calibrationFrequencyMonths ? `${instrument.calibrationFrequencyMonths} meses` : "Não aplicável",
      ],
    ];
    const pad = 10;
    const colW = (CONTENT_W - pad * 3) / 2;
    const boxTop = y;
    y += pad;
    for (let i = 0; i < left.length; i++) {
      const rowY = y;
      const hl = labelValue(left[i][0], left[i][1], MARGIN + pad, colW, 8);
      y = rowY;
      const hr = labelValue(right[i][0], right[i][1], MARGIN + pad * 2 + colW, colW, 8);
      y = rowY + Math.max(hl, hr) + 3;
    }
    y += pad - 3;
    doc.roundedRect(MARGIN, boxTop, CONTENT_W, y - boxTop, 6).lineWidth(0.9).strokeColor(BORDER).stroke();
    y += 12;

    // ------------------------------------------------------ itens numerados
    let n = 1;
    const ambiente = [
      cal.ambientTemperature != null ? `Temperatura: ${num(cal.ambientTemperature, 1)} °C` : null,
      cal.ambientHumidity != null ? `Umidade relativa: ${num(cal.ambientHumidity, 1)} % UR` : null,
    ]
      .filter(Boolean)
      .join("  |  ");
    numbered(n++, "Condições ambientais", [ambiente || "Não registradas", cal.environmentalNotes].filter(Boolean).join(". "));

    numbered(
      n++,
      "Procedimento de calibração",
      [cal.procedure ? `Procedimento: ${cal.procedure}` : null, `Local da calibração: ${cal.location}`]
        .filter(Boolean)
        .join(". ") + ".",
    );

    if (cal.standards.length > 0) {
      numbered(n++, "Padrões utilizados e rastreabilidade");
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
      numbered(
        n++,
        "Padrões utilizados e rastreabilidade",
        [cal.standardUsed, cal.traceability].filter(Boolean).join(". ") || "-",
      );
    }

    numbered(n++, "Notas");
    bullet(
      `A incerteza expandida de medição declarada corresponde à incerteza padrão combinada multiplicada pelo fator ` +
        `de abrangência k = ${num(cal.coverageFactorK ?? 2, 2)}, para um nível de confiança de aproximadamente 95%.`,
    );
    bullet("Os resultados referem-se exclusivamente ao item calibrado, nas condições indicadas neste certificado.");
    // Media (valor indicado), erro e desvio vem das leituras de repetibilidade - documenta
    // os valores individuais de cada ponto, pra rastreabilidade de como a media saiu.
    const temPontosNomeados = cal.points.some((p) => p.label);
    const rotuloDoPonto = (p: (typeof cal.points)[number]) =>
      [p.label, p.sensorTypeName ? `(${p.sensorTypeName})` : null].filter(Boolean).join(" ") || "-";
    const pontosComLeituras = cal.points.filter((p) => p.readings.length > 0);
    if (pontosComLeituras.length > 0) {
      const leituras = pontosComLeituras
        .map((p) => {
          const ponto = p.label ? rotuloDoPonto(p) : num(p.standardValue);
          return `${ponto}: ${p.readings.map((r) => num(r.value)).join("; ")} (n=${p.readings.length})`;
        })
        .join("  |  ");
      bullet(`Valor indicado = média das leituras. Leituras individuais por ponto${unit}: ${leituras}.`);
    }
    // Pontos nao realizados sempre levam uma observacao (exigida no formulario) -
    // documentar o motivo no certificado, nao so' deixar "-" nas colunas.
    for (const p of cal.points.filter((pt) => pt.notes)) {
      bullet(`${p.label ? `${p.label}: ` : ""}${p.notes}`);
    }
    y += 5;

    // ------------------------------------------------------------ resultados
    numbered(n++, "Resultados da calibração");
    const RESULT_COL = temPontosNomeados ? 7 : 6;
    table(
      [
        ...(temPontosNomeados ? ["Ponto"] : []),
        `Valor padrão${unit}`,
        `Valor indicado${unit}`,
        `Erro${unit}`,
        `Desvio${unit}`,
        `Tolerância${unit}`,
        `Incerteza${unit}`,
        "Resultado",
      ],
      cal.points.map((p) =>
        p.performed === false
          ? [...(temPontosNomeados ? [rotuloDoPonto(p)] : []), "-", "-", "-", "-", "-", "-", "Não realizado"]
          : [
              ...(temPontosNomeados ? [rotuloDoPonto(p)] : []),
              num(p.standardValue),
              num(p.indicatedValue),
              num(p.error),
              num(p.deviation),
              `± ${num(p.tolerance)}`,
              `± ${num(p.uncertainty)}`,
              p.result === "PASS" ? "Aprovado" : "Reprovado",
            ],
      ),
      temPontosNomeados ? [22, 11, 12, 9, 9, 11, 11, 13] : [15, 15, 13, 12, 15, 15, 15],
      {
        align: temPontosNomeados ? ["left", ...Array(7).fill("center")] : Array(7).fill("center"),
        colColor: (row, col) =>
          col !== RESULT_COL ? undefined : row[col] === "Aprovado" ? GREEN : row[col] === "Reprovado" ? RED : GRAPHITE,
      },
    );

    // ------------------------------------------------------------- conclusao
    doc.font(FONT).fontSize(8.5);
    const conclusao = `${resultLabel}. ${cal.technicalConclusion}`;
    const conclH = doc.heightOfString(conclusao, { width: CONTENT_W - 14 }) + 14;
    numbered(n++, "Conclusão técnica");
    ensure(conclH);
    doc.roundedRect(MARGIN, y, CONTENT_W, conclH, 5).fillColor("#f9fafb").fill();
    doc.rect(MARGIN, y, 3, conclH).fillColor(resultColor).fill();
    doc.font(FONT_BOLD).fontSize(8.5).fillColor(resultColor).text(`${resultLabel}. `, MARGIN + 12, y + 7, {
      width: CONTENT_W - 18,
      continued: true,
    });
    doc.font(FONT).fillColor(INK).text(cal.technicalConclusion, { width: CONTENT_W - 18, align: "justify" });
    y += conclH + 6;
    if (cal.observations) {
      doc.font(FONT).fontSize(8);
      const obs = `Observações: ${cal.observations}`;
      const h = doc.heightOfString(obs, { width: CONTENT_W });
      ensure(h);
      doc.fillColor(GRAPHITE).text(obs, MARGIN, y, { width: CONTENT_W, align: "justify" });
      y += h + 6;
    }

    // ------------------------------------- datas + validacao + assinatura + emissor
    // Bloco unico (~150pt): nao se divide entre paginas.
    ensure(150);
    y += 8;
    const blockY = y;

    // Datas
    y = blockY + 8;
    y += labelValue("Data da calibração:", fmtDate(cal.calibrationDate), MARGIN, 170) + 3;
    y += labelValue("Data de emissão:", fmtDate(cal.issuedAt ?? new Date()), MARGIN, 170) + 3;
    labelValue("Validade:", fmtDate(cal.validUntil), MARGIN, 170);

    // QR Code de validacao (centro)
    const qrSize = 62;
    const qrX = MARGIN + 190;
    try {
      const qrBuf = Buffer.from(qrCodeDataUrl.split(",")[1] ?? "", "base64");
      if (qrBuf.length > 0) doc.image(qrBuf, qrX, blockY, { fit: [qrSize, qrSize] });
    } catch {
      // QR e um reforco de autenticidade; sua ausencia nao invalida o documento
    }
    doc.font(FONT).fontSize(6.5).fillColor(GRAPHITE);
    doc.text("Valide a autenticidade:", qrX + qrSize + 6, blockY + 18, { width: 92 });
    doc.fillColor(BLUE).text(validationUrl, qrX + qrSize + 6, blockY + 28, { width: 92 });

    // Assinatura (direita)
    const sigW = 160;
    const sigH = 62;
    const sigX = MARGIN + CONTENT_W - sigW;
    doc.roundedRect(sigX, blockY, sigW, sigH, 6).lineWidth(0.9).strokeColor(BORDER).stroke();
    doc.moveTo(sigX + 16, blockY + 32).lineTo(sigX + sigW - 16, blockY + 32).lineWidth(0.6).strokeColor(GRAPHITE).stroke();
    doc.font(FONT_BOLD).fontSize(8.5).fillColor(NAVY);
    doc.text(cal.technician.name, sigX + 6, blockY + 36, { width: sigW - 12, align: "center" });
    doc.font(FONT).fontSize(7).fillColor(GRAPHITE);
    doc.text("Responsável técnico", sigX + 6, blockY + 48, { width: sigW - 12, align: "center" });

    // Quadro do emissor
    y = blockY + Math.max(sigH, qrSize) + 12;
    const emW = 300;
    doc.font(FONT).fontSize(7.5);
    const emLines = [company.address, `${company.phone}  |  ${company.email}`];
    const emH = 22 + emLines.reduce((acc, l) => acc + doc.heightOfString(l, { width: emW - 20 }) + 1, 0) + 8;
    doc.roundedRect(MARGIN, y, emW, emH, 6).lineWidth(0.9).strokeColor(BORDER).stroke();
    doc.font(FONT_BOLD).fontSize(8.5).fillColor(NAVY).text(company.fullName, MARGIN + 10, y + 8, { width: emW - 20 });
    let ey = y + 8 + doc.heightOfString(company.fullName, { width: emW - 20 }) + 3;
    doc.font(FONT).fontSize(7.5).fillColor(GRAPHITE);
    for (const l of emLines) {
      doc.text(l, MARGIN + 10, ey, { width: emW - 20 });
      ey += doc.heightOfString(l, { width: emW - 20 }) + 1;
    }
    y += emH + 10;

    // ------------------------------------------------- registro fotografico
    if (photos.length > 0) {
      newPage();
      doc.font(FONT_BOLD).fontSize(11).fillColor(NAVY).text("Anexo - Registro fotográfico", MARGIN, y);
      y += 18;
      doc.moveTo(MARGIN, y).lineTo(MARGIN + CONTENT_W, y).lineWidth(1.4).strokeColor(NAVY).stroke();
      y += 12;

      const gap = 12;
      const imgW = (CONTENT_W - gap) / 2;
      const imgH = imgW * 0.72;
      let col = 0;

      for (const photo of photos) {
        if (y + imgH + 26 > BOTTOM) {
          newPage();
          col = 0;
        }
        const x = MARGIN + col * (imgW + gap);
        try {
          doc.save();
          doc.roundedRect(x, y, imgW, imgH, 5).clip();
          doc.image(photo.buffer, x, y, { cover: [imgW, imgH], align: "center", valign: "center" });
          doc.restore();
          doc.roundedRect(x, y, imgW, imgH, 5).lineWidth(0.7).strokeColor(BORDER).stroke();
        } catch {
          doc.restore();
          doc.roundedRect(x, y, imgW, imgH, 5).fillColor(TINT).fill();
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

    // ------------------------------------- marca-d'agua e rodape de todas as paginas
    const markPath = data.logoPath ? path.join(path.dirname(data.logoPath), "logo-mark.png") : "";
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      // Sem zerar a margem inferior, o PDFKit entende que o rodape nao cabe na
      // area util e cria uma pagina nova para cada rodape escrito.
      doc.page.margins.bottom = 0;

      if (markPath && existsSync(markPath)) {
        try {
          doc.save();
          doc.opacity(0.045);
          doc.image(markPath, (PAGE_WIDTH - 330) / 2, 250, { fit: [330, 330], align: "center", valign: "center" });
          doc.restore();
        } catch {
          doc.restore();
        }
      }

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
      doc.text(`Página ${i + 1} de ${range.count}`, MARGIN, footY + 6, { width: CONTENT_W, align: "right" });
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
