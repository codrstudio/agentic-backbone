import mssql from "mssql";
import type { z } from "zod";
import type { AdapterInstance } from "../types.js";
import type { credentialSchema, optionsSchema } from "./schemas.js";

type Credential = z.infer<typeof credentialSchema>;
type Options = z.infer<typeof optionsSchema>;

export function createSqlServerClient(credential: Credential, options: Options): AdapterInstance {
  const pool = new mssql.ConnectionPool({
    server: credential.host,
    port: credential.port,
    database: credential.database,
    user: credential.user,
    password: credential.password,
    pool: { max: options.connectionLimit },
    options: {
      encrypt: credential.encrypt,
      trustServerCertificate: credential.trustServerCertificate,
    },
  });

  const ready = pool.connect();

  return {
    async query(sql: unknown) {
      await ready;
      const result = await pool.request().query(String(sql));
      return result.recordset;
    },

    async mutate(sql: unknown) {
      await ready;
      const result = await pool.request().query(String(sql));
      return { rowsAffected: result.rowsAffected[0] ?? 0 };
    },

    async close() {
      await pool.close();
    },
  } as AdapterInstance;
}
