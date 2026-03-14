import { tool } from "ai";
import { z } from "zod";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const DRAFTS_DIR = join(process.cwd(), "data", "email-drafts");

export interface EmailDraft {
  draftId: string;
  adapter: string;
  to: string | string[];
  subject: string;
  body: string;
  html?: string;
  cc?: string[];
  reply_to?: string;
  in_reply_to?: string;
  references?: string;
  attachments?: Array<{ filename: string; content_base64: string }>;
  createdAt: string;
}

export function createEmailDraftCreateTool(slugs: [string, ...string[]]): Record<string, any> {
  return {
    email_draft_create: tool({
      description:
        "Cria um rascunho de email para revisão humana. Use email_draft_send para enviar após aprovação.",
      parameters: z.object({
        adapter: z.enum(slugs).describe("Email adapter slug"),
        to: z.union([z.string(), z.array(z.string())]).describe("Destinatário(s)"),
        subject: z.string().describe("Assunto"),
        body: z.string().describe("Corpo em texto puro"),
        html: z.string().optional().describe("Corpo em HTML"),
        cc: z.array(z.string()).optional().describe("Cópias"),
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
          const draftId = randomUUID();
          const adapterDir = join(DRAFTS_DIR, args.adapter);
          mkdirSync(adapterDir, { recursive: true });

          const draft: EmailDraft = {
            draftId,
            adapter: args.adapter,
            to: args.to,
            subject: args.subject,
            body: args.body,
            html: args.html,
            cc: args.cc,
            reply_to: args.reply_to,
            in_reply_to: args.in_reply_to,
            references: args.references,
            attachments: args.attachments,
            createdAt: new Date().toISOString(),
          };

          writeFileSync(join(adapterDir, `${draftId}.json`), JSON.stringify(draft, null, 2), "utf8");

          return { draftId, message: "Rascunho salvo. Use email_draft_send para enviar." };
        } catch (err) {
          return { error: err instanceof Error ? err.message : String(err) };
        }
      },
    }),
  };
}
