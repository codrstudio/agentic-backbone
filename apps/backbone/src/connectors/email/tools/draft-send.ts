import { tool } from "ai";
import { z } from "zod";
import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { formatError } from "../../../utils/errors.js";
import type { EmailDraft } from "./draft-create.js";

const DRAFTS_DIR = join(process.cwd(), "data", "email-drafts");

export function createEmailDraftSendTool(slugs: [string, ...string[]]): Record<string, any> {
  return {
    email_draft_send: tool({
      description:
        "Envia um rascunho previamente criado com email_draft_create. Remove o rascunho após envio bem-sucedido.",
      parameters: z.object({
        adapter: z.enum(slugs).describe("Email adapter slug"),
        draft_id: z.string().describe("ID do rascunho a enviar"),
      }),
      execute: async (args) => {
        try {
          const draftPath = join(DRAFTS_DIR, args.adapter, `${args.draft_id}.json`);
          if (!existsSync(draftPath)) {
            return { error: `Draft "${args.draft_id}" not found for adapter "${args.adapter}"` };
          }

          const draft: EmailDraft = JSON.parse(readFileSync(draftPath, "utf8"));

          const { connectorRegistry } = await import("../../index.js");
          const adapter = connectorRegistry.findAdapter(args.adapter);
          if (!adapter) return { error: `Adapter "${args.adapter}" not found` };

          const { credentialSchema, optionsSchema } = await import("../schemas.js");
          const cred = credentialSchema.parse(adapter.credential);
          const opts = optionsSchema.parse(adapter.options);

          const { createEmailClient } = await import("../client.js");
          const client = createEmailClient(cred, opts);

          const result = await client.sendSmtp({
            from: cred.smtp_user,
            fromName: opts.from_name || cred.smtp_user,
            to: draft.to,
            subject: draft.subject,
            text: draft.body,
            html: draft.html,
            cc: draft.cc,
            replyTo: draft.reply_to,
            inReplyTo: draft.in_reply_to,
            references: draft.references,
            attachments: draft.attachments?.map((a) => ({
              filename: a.filename,
              content: a.content_base64,
              encoding: "base64" as const,
            })),
          });

          // Remove draft after successful send
          unlinkSync(draftPath);

          return { ...result, draftId: args.draft_id, message: "Rascunho enviado e removido." };
        } catch (err) {
          return { error: formatError(err) };
        }
      },
    }),
  };
}
