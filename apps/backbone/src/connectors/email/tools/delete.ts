import { tool } from "ai";
import { z } from "zod";
import { formatError } from "../../../utils/errors.js";

export function createEmailDeleteTool(slugs: [string, ...string[]]): Record<string, any> {
  return {
    email_delete: tool({
      description:
        "Exclui emails permanentemente (flag \\Deleted + EXPUNGE). Irreversível.",
      parameters: z.object({
        adapter: z.enum(slugs).describe("Email adapter slug"),
        uids: z.array(z.number()).describe("UIDs dos emails a excluir"),
        mailbox: z.string().optional().describe("Pasta (default: INBOX)"),
      }),
      execute: async (args) => {
        try {
          const { connectorRegistry } = await import("../../index.js");
          const adapter = connectorRegistry.findAdapter(args.adapter);
          if (!adapter) return { error: `Adapter "${args.adapter}" not found` };

          const { credentialSchema, optionsSchema } = await import("../schemas.js");
          const cred = credentialSchema.parse(adapter.credential);
          const opts = optionsSchema.parse(adapter.options);

          const { createEmailClient } = await import("../client.js");
          const client = createEmailClient(cred, opts);

          await client.deleteMessages(args.mailbox ?? opts.mailbox, args.uids);

          return { ok: true, deleted: args.uids.length };
        } catch (err) {
          return { error: formatError(err) };
        }
      },
    }),
  };
}
