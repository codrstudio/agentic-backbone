import { tool } from "ai";
import { z } from "zod";
import { formatError } from "../../../utils/errors.js";

export function createEmailSendTool(slugs: [string, ...string[]]): Record<string, any> {
  return {
    email_send: tool({
      description:
        "Envia um email via SMTP. Suporta texto puro, HTML, CC, BCC, anexos e threading. Para HTML, informe body (fallback texto) e html (versão rica).",
      parameters: z.object({
        adapter: z.enum(slugs).describe("Email adapter slug"),
        to: z.union([z.string(), z.array(z.string())]).describe("Destinatário(s)"),
        subject: z.string().describe("Assunto"),
        body: z.string().describe("Corpo em texto puro"),
        html: z.string().optional().describe("Corpo em HTML (alternativa rica ao body)"),
        cc: z.array(z.string()).optional().describe("Cópias"),
        bcc: z.array(z.string()).optional().describe("Cópias ocultas"),
        reply_to: z.string().optional().describe("Endereço de resposta"),
        in_reply_to: z.string().optional().describe("Message-ID para threading"),
        references: z.string().optional().describe("Message-IDs da thread"),
        attachments: z
          .array(
            z.object({
              filename: z.string(),
              content_base64: z.string(),
            })
          )
          .optional()
          .describe("Anexos em base64"),
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

          return await client.sendSmtp({
            from: cred.smtp_user,
            fromName: opts.from_name || cred.smtp_user,
            to: args.to,
            subject: args.subject,
            text: args.body,
            html: args.html,
            cc: args.cc,
            bcc: args.bcc,
            replyTo: args.reply_to,
            inReplyTo: args.in_reply_to,
            references: args.references,
            attachments: args.attachments?.map((a) => ({
              filename: a.filename,
              content: a.content_base64,
              encoding: "base64" as const,
            })),
          });
        } catch (err) {
          return { error: formatError(err) };
        }
      },
    }),
  };
}
