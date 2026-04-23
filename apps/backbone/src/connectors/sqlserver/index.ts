import type { ConnectorDef } from "../types.js";
import { credentialSchema, optionsSchema } from "./schemas.js";
import { createSqlServerClient } from "./client.js";
import { createSqlServerQueryTool } from "./tools/query.js";
import { createSqlServerMutateTool } from "./tools/mutate.js";

export const sqlserverConnector: ConnectorDef = {
  slug: "sqlserver",
  credentialSchema,
  optionsSchema,
  createClient(credential, options) {
    return createSqlServerClient(
      credentialSchema.parse(credential),
      optionsSchema.parse(options),
    );
  },
  createTools(adapters) {
    if (adapters.length === 0) return null;
    const slugs = adapters.map((a) => a.slug) as [string, ...string[]];
    const policyMap = new Map(adapters.map((a) => [a.slug, a.policy]));
    return {
      ...createSqlServerQueryTool(slugs),
      ...createSqlServerMutateTool(slugs, policyMap),
    };
  },
};
