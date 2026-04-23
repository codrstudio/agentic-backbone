import { tool } from "ai";
import { z } from "zod";
import { guardMutate } from "./_guards.js";
import { formatError } from "../../../utils/errors.js";

export function createSqlServerMutateTool(
  slugs: [string, ...string[]],
  policyMap: Map<string, string>,
): Record<string, any> {
  return {
    sqlserver_mutate: tool({
      description:
        "Execute a DML mutation (INSERT, UPDATE, DELETE, MERGE) on a SQL Server database. Returns rowsAffected. To capture inserted IDs use OUTPUT INSERTED.id in the query.",
      parameters: z.object({
        database: z.enum(slugs).describe("Adapter/database slug"),
        sql: z.string().describe("SQL DML statement"),
      }),
      execute: async (args) => {
        const policy = policyMap.get(args.database) ?? "readonly";
        const rejection = guardMutate(args.sql, policy);
        if (rejection) return { error: rejection };
        try {
          const { connectorRegistry } = await import("../../index.js");
          const instance = connectorRegistry.createClient(args.database);
          return await instance.mutate(args.sql);
        } catch (err) {
          return { error: formatError(err) };
        }
      },
    }),
  };
}
