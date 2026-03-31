import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join, extname } from "node:path";

const MB = 1024 * 1024;

export const MIME_LIMITS: Record<string, number> = {
  "image/png": 20 * MB,
  "image/jpeg": 20 * MB,
  "image/gif": 20 * MB,
  "image/webp": 20 * MB,
  "audio/wav": 25 * MB,
  "audio/mp3": 25 * MB,
  "audio/mpeg": 25 * MB,
  "audio/ogg": 25 * MB,
  "audio/webm": 25 * MB,
  "application/pdf": 30 * MB,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": 15 * MB,
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": 10 * MB,
  "text/plain": 5 * MB,
  "text/csv": 5 * MB,
  "application/json": 5 * MB,
};

export const ACCEPTED_MIME_TYPES = new Set(Object.keys(MIME_LIMITS));

export const TOTAL_SIZE_LIMIT = 50 * MB;
export const MAX_FILES = 10;

export function generateAttachmentId(originalName: string): string {
  const ts = Date.now();
  const hex = randomBytes(3).toString("hex");
  const ext = extname(originalName);
  return `att_${ts}_${hex}${ext}`;
}

export function sessionAttachmentsDir(sessionDir: string): string {
  return join(sessionDir, "attachments");
}

export async function saveAttachment(
  sessionDir: string,
  file: File
): Promise<{ id: string; path: string }> {
  const id = generateAttachmentId(file.name);
  const dir = sessionAttachmentsDir(sessionDir);
  await mkdir(dir, { recursive: true });
  const filePath = join(dir, id);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);
  return { id, path: filePath };
}
