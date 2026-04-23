import { z } from "zod";

export const credentialSchema = z.object({
  host: z.string(),
  port: z.coerce.number().default(1433),
  database: z.string(),
  user: z.string(),
  password: z.string(),
  encrypt: z.boolean().default(true),
  trustServerCertificate: z.boolean().default(false),
});

export const optionsSchema = z.object({
  connectionLimit: z.coerce.number().default(10),
});
