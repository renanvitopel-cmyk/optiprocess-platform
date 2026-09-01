import { Router } from "express";
import { createReadStream, existsSync } from "node:fs";
import path from "node:path";
import { verifyLocalSignature, localStorageFilePath } from "../../lib/storage";

export const localStorageRouter = Router();

const MIME_BY_EXTENSION: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

// Serve arquivos do storage local (somente dev) atraves de uma URL assinada com
// expiracao, no mesmo espirito de uma presigned URL do S3/R2 - so funciona quem
// recebeu o link gerado pela API depois de uma checagem de permissao real.
localStorageRouter.get("/:key(*)", (req, res) => {
  const key = req.params.key;
  const exp = Number(req.query.exp);
  const sig = String(req.query.sig ?? "");

  if (!key || !exp || !sig || !verifyLocalSignature(key, exp, sig)) {
    res.status(403).json({ message: "Link expirado ou invalido." });
    return;
  }

  const filePath = localStorageFilePath(key);
  if (!existsSync(filePath)) {
    res.status(404).json({ message: "Arquivo nao encontrado." });
    return;
  }

  const displayName = typeof req.query.name === "string" ? req.query.name : path.basename(filePath);
  const mimeType = MIME_BY_EXTENSION[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";

  res.setHeader("Cache-Control", "private, max-age=60");
  res.setHeader("Content-Type", mimeType);
  res.setHeader("Content-Disposition", `inline; filename="${displayName.replace(/"/g, "")}"`);
  createReadStream(filePath).pipe(res);
});
