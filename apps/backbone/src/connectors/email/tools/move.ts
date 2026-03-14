import { tool } from "ai";
import { z } from "zod";
import { formatError } from "../../../utils/errors.js";

export function createEmailMoveTool(slugs: [string, ...string[]]): Record<string, any> {
  return {
    email_move: tool({
      description:
        "Move emails entre pastas. Use email_list_mailboxes para ver pastas disponíveis.",
      parameters: z.object({
        adapter: z.enum(slugs).describe("Email adapter slug"),
        uids: z.array(z.number()).describe("UIDs dos emails"),
        dest_mailbox: z.string().describe("Pasta de destino"),
        source_mailbox: z.string().optional().describe("Pasta de origem (default: INBOX)"),
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

          await client.moveMessages(
            args.source_mailbox ?? opts.mailbox,
            args.uids,
            args.dest_mailbox
          );

          return {
            ok: true,
            moved: args.uids.length,
            from: args.source_mailbox ?? opts.mailbox,
            to: args.dest_mailbox,
          };
        } catch (err) {
          return { error: formatError(err) };
        }
      },
    }),
  };
}
