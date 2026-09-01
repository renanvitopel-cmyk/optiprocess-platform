import QRCode from "qrcode";
import { env } from "../config/env";

/** Monta a URL publica de validacao e retorna o QR Code como data URL (PNG base64). */
export async function generateCertificateQrCode(qrCodeToken: string): Promise<{ url: string; dataUrl: string }> {
  const url = `${env.publicUrl}/validar-certificado/${qrCodeToken}`;
  const dataUrl = await QRCode.toDataURL(url, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 320,
    color: { dark: "#0b1729", light: "#ffffff" },
  });
  return { url, dataUrl };
}
