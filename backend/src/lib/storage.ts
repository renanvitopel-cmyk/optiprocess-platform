import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createHmac, timingSafeEqual } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { env } from "../config/env";

export interface StorageProvider {
  upload(key: string, buffer: Buffer, contentType: string): Promise<void>;
  getSignedDownloadUrl(key: string, fileName: string, expiresInSeconds?: number): Promise<string>;
  delete(key: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// Implementacao S3-compativel (Cloudflare R2, ou qualquer S3 compativel)
// ---------------------------------------------------------------------------

class S3StorageProvider implements StorageProvider {
  private client: S3Client;

  constructor() {
    this.client = new S3Client({
      region: env.storage.s3Region,
      endpoint: env.storage.s3Endpoint,
      credentials: {
        accessKeyId: env.storage.s3AccessKeyId,
        secretAccessKey: env.storage.s3SecretAccessKey,
      },
    });
  }

  async upload(key: string, buffer: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: env.storage.s3Bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );
  }

  async getSignedDownloadUrl(key: string, fileName: string, expiresInSeconds = 300): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: env.storage.s3Bucket,
      Key: key,
      ResponseContentDisposition: `inline; filename="${fileName}"`,
    });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: env.storage.s3Bucket, Key: key }));
  }
}

// ---------------------------------------------------------------------------
// Implementacao local (somente desenvolvimento - Render tem disco efemero)
// URLs assinadas com HMAC + expiracao, mesmo contrato do S3 presigned URL.
// ---------------------------------------------------------------------------

const LOCAL_ROOT = path.resolve(process.cwd(), "storage-local");

class LocalStorageProvider implements StorageProvider {
  async upload(key: string, buffer: Buffer, _contentType: string): Promise<void> {
    const filePath = path.join(LOCAL_ROOT, key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, buffer);
  }

  async getSignedDownloadUrl(key: string, fileName: string, expiresInSeconds = 300): Promise<string> {
    const expiresAt = Date.now() + expiresInSeconds * 1000;
    const signature = signLocalKey(key, expiresAt);
    const query = new URLSearchParams({ exp: String(expiresAt), sig: signature, name: fileName });
    return `${env.publicUrl}/api/local-storage/${encodeURIComponent(key)}?${query.toString()}`;
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(LOCAL_ROOT, key);
    await fs.rm(filePath, { force: true });
  }
}

export function signLocalKey(key: string, expiresAt: number): string {
  return createHmac("sha256", env.jwtSecret).update(`${key}:${expiresAt}`).digest("hex");
}

export function verifyLocalSignature(key: string, expiresAt: number, signature: string): boolean {
  if (Date.now() > expiresAt) return false;
  const expected = signLocalKey(key, expiresAt);
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function localStorageFilePath(key: string): string {
  return path.join(LOCAL_ROOT, key);
}

// ---------------------------------------------------------------------------

let instance: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (!instance) {
    instance = env.storage.provider === "s3" ? new S3StorageProvider() : new LocalStorageProvider();
  }
  return instance;
}
