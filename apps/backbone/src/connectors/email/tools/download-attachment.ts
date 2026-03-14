import { tool } from "ai";
import { z } from "zod";
import { formatError } from "../../../utils/errors.js";

export function createEmailDownloadAttachmentTool(slugs: [string, ...string[]]): Record<string, any> {
  return {
    email_download_attachment: tool({
      description:
        "Faz download de um anexo pelo UID e part_id (obtido via email_read). Retorna base64. Limite de 5MB.",
      parameters: z.object({
        adapter: z.enum(slugs).describe("Email adapter slug"),
        uid: z.number().describe("UID do email"),
        part_id: z.string().describe("Part ID do anexo (obtido via email_read)"),
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

          return await client.downloadAttachment(
            args.mailbox ?? opts.mailbox,
            args.uid,
            args.part_id
          );
        } catch (err) {
          return { error: formatError(err) };
        }
      },
    }),
  };
}
