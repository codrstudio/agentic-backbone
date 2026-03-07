# WhatsApp Typed Tools — Substituir proxy generico por tools tipadas

## Objetivo

Substituir a tool generica `evolution_api` (proxy HTTP que exige conhecimento de endpoints) por um conjunto de tools WhatsApp especificas com schemas Zod tipados, nomes semanticos e `.describe()` em pt-BR — maximizando a capacidade do LLM de usar a Evolution API sem erros.

---

## Execution Mode

`implementar`

---

## Contexto

### Estado atual

Uma unica tool `evolution_api` em `apps/backbone/src/connectors/evolution/tools/evolution-api.ts`:

```typescript
evolution_api: tool({
  description: "Call the Evolution API (WhatsApp gateway). Supports GET and POST methods.",
  parameters: z.object({
    instance: z.enum(slugs),
    method: z.enum(["GET", "POST"]),
    endpoint: z.string(),
    body: z.string().optional(),
  }),
})
```

O LLM recebe apenas 4 parametros genericos. Precisa "adivinhar" endpoints, formato do body JSON, e campos obrigatorios. Resultado: erros frequentes de formato, endpoints errados, campos faltando.

### Problema / Motivacao

O Vercel AI SDK converte schemas Zod em JSON Schema no request ao LLM. Cada `.describe()` vira uma descricao de campo visivel ao modelo. Tools especificas com parametros tipados eliminam a ambiguidade — o LLM ve exatamente quais campos existem, quais sao obrigatorios, e o que cada um significa.

### O que muda

| Aspecto | Antes | Depois |
|---|---|---|
| Tools WhatsApp | 1 tool generica (`evolution_api`) | ~30 tools especificas + fallback generico |
| Parametros | `endpoint` + `body` (string JSON) | Campos tipados com Zod + `.describe()` |
| Erros do LLM | Frequentes (endpoint errado, body malformado) | Raros (schema valida antes de executar) |
| Arquivo de tools | 1 arquivo (`evolution-api.ts`) | 6 arquivos (`messages.ts`, `chats.ts`, `groups.ts`, `labels.ts`, `instances.ts`, `evolution-api.ts`) |
| `createTools()` no connector | Retorna 1 tool | Compoe todas as tools dos 6 arquivos |

---

## Especificacao

### 1. Arquitetura de arquivos

```
apps/backbone/src/connectors/evolution/tools/
  index.ts              ← compoe todas as tools, exporta createEvolutionTools()
  messages.ts           ← tools de envio de mensagens (10 tools)
  chats.ts              ← tools de chat/contatos (10 tools)
  groups.ts             ← tools de grupos (11 tools)
  labels.ts             ← tools de labels (2 tools)
  instances.ts          ← tools operacionais (2 tools)
  evolution-api.ts      ← fallback generico (mantido, renomeado para whatsapp_api_raw)
```

### 2. Pattern de cada tool

Todas as tools seguem este pattern (extraido do mysql connector):

```typescript
import { tool } from "ai";
import { z } from "zod";

export function createXxxTools(slugs: [string, ...string[]]): Record<string, any> {
  return {
    whatsapp_send_text: tool({
      description: "Envia uma mensagem de texto via WhatsApp.",
      parameters: z.object({
        instance: z.enum(slugs).describe("Instancia do WhatsApp a usar"),
        number: z.string().describe("Numero do destinatario no formato internacional sem + (ex: 5532988887777)"),
        text: z.string().describe("Texto da mensagem"),
        // ... parametros opcionais com .optional() e .describe()
      }),
      execute: async (args) => {
        try {
          const { connectorRegistry } = await import("../../index.js");
          const client = connectorRegistry.createClient(args.instance);
          return await client.send(`/message/sendText/${args.instance}`, {
            number: args.number,
            text: args.text,
          });
        } catch (err) {
          return { error: err instanceof Error ? err.message : String(err) };
        }
      },
    }),
  };
}
```

Regras do pattern:
- Lazy import do `connectorRegistry` (evita dependencia circular)
- `.describe()` em portugues claro em todos os campos
- `instance` sempre como `z.enum(slugs)`
- Erros retornam `{ error: "mensagem" }`
- O endpoint da Evolution API usa o slug do adapter como instance name
- Cada funcao `createXxxTools(slugs)` retorna `Record<string, any>`

### 3. Arquivo: `tools/messages.ts`

10 tools de envio de mensagens:

| Tool | Endpoint | Parametros obrigatorios | Parametros opcionais |
|---|---|---|---|
| `whatsapp_send_text` | `POST /message/sendText/:instance` | `instance`, `number`, `text` | `delay`, `linkPreview`, `quoted`, `mentioned` |
| `whatsapp_send_media` | `POST /message/sendMedia/:instance` | `instance`, `number`, `mediatype` (enum: image, document, video, audio), `media` (URL) | `caption`, `fileName` |
| `whatsapp_send_audio` | `POST /message/sendWhatsAppAudio/:instance` | `instance`, `number`, `audio` (URL) | — |
| `whatsapp_send_location` | `POST /message/sendLocation/:instance` | `instance`, `number`, `latitude`, `longitude`, `name`, `address` | — |
| `whatsapp_send_contact` | `POST /message/sendContact/:instance` | `instance`, `number`, `contact` (array de `{fullName, wuid, phoneNumber}`) | — |
| `whatsapp_send_reaction` | `POST /message/sendReaction/:instance` | `instance`, `key` (`{id, remoteJid, fromMe}`), `reaction` (emoji) | — |
| `whatsapp_send_poll` | `POST /message/sendPoll/:instance` | `instance`, `number`, `name`, `values` (array 2-10 strings) | `selectableCount` (0-10, default 1) |
| `whatsapp_send_sticker` | `POST /message/sendSticker/:instance` | `instance`, `number`, `sticker` (URL) | — |
| `whatsapp_send_list` | `POST /message/sendList/:instance` | `instance`, `number`, `title`, `footerText`, `buttonText`, `sections` | — |
| `whatsapp_send_buttons` | `POST /message/sendButtons/:instance` | `instance`, `number`, `title`, `description`, `buttons` | `footer` |

#### Schemas detalhados para tipos complexos

```typescript
// whatsapp_send_contact — campo contact
const contactItemSchema = z.object({
  fullName: z.string().describe("Nome completo do contato"),
  wuid: z.string().describe("WhatsApp ID do contato (numero@s.whatsapp.net)"),
  phoneNumber: z.string().describe("Numero de telefone do contato"),
});

// whatsapp_send_reaction — campo key
const messageKeySchema = z.object({
  id: z.string().describe("ID da mensagem a reagir"),
  remoteJid: z.string().describe("JID do chat (numero@s.whatsapp.net ou grupo@g.us)"),
  fromMe: z.boolean().describe("Se a mensagem foi enviada por nos"),
});

// whatsapp_send_list — campo sections
const listSectionSchema = z.object({
  title: z.string().describe("Titulo da secao"),
  rows: z.array(z.object({
    title: z.string().describe("Titulo da opcao"),
    description: z.string().optional().describe("Descricao da opcao"),
    rowId: z.string().describe("ID unico da opcao"),
  })).describe("Opcoes dentro da secao"),
});

// whatsapp_send_buttons — campo buttons
const buttonSchema = z.object({
  buttonId: z.string().describe("ID unico do botao"),
  buttonText: z.object({
    displayText: z.string().describe("Texto exibido no botao"),
  }),
  type: z.literal(1).optional(),
});
```

### 4. Arquivo: `tools/chats.ts`

10 tools de operacoes de chat:

| Tool | Metodo | Endpoint | Parametros |
|---|---|---|---|
| `whatsapp_check_numbers` | POST | `/chat/whatsappNumbers/:instance` | `instance`, `numbers` (array de strings) |
| `whatsapp_mark_as_read` | POST | `/chat/markMessageAsRead/:instance` | `instance`, `readMessages` (array de `{id, remoteJid}`) |
| `whatsapp_archive_chat` | POST | `/chat/archiveChat/:instance` | `instance`, `chat` (JID), `archive` (boolean) |
| `whatsapp_delete_message` | POST | `/chat/deleteMessageForEveryone/:instance` | `instance`, `remoteJid`, `messageId`, `fromMe` |
| `whatsapp_send_presence` | POST | `/chat/sendPresence/:instance` | `instance`, `number`, `presence` (enum: composing, recording, paused) |
| `whatsapp_block_contact` | POST | `/chat/updateBlockStatus/:instance` | `instance`, `number`, `action` (enum: block, unblock) |
| `whatsapp_find_contacts` | POST | `/chat/findContacts/:instance` | `instance`, `where` (objeto de filtro opcional) |
| `whatsapp_find_messages` | POST | `/chat/findMessages/:instance` | `instance`, `where` (objeto de filtro: `key.remoteJid`, `messageTimestamp`, etc.) |
| `whatsapp_find_chats` | POST | `/chat/findChats/:instance` | `instance` |
| `whatsapp_fetch_profile` | POST | `/chat/fetchProfile/:instance` | `instance`, `number` |

#### Nota sobre filtros

`whatsapp_find_contacts` e `whatsapp_find_messages` aceitam `where` como `z.record(z.unknown())` com `.describe()` explicando os campos comuns. Nao tipar rigidamente — a API aceita filtros variados e tipar todos seria excessivo.

```typescript
where: z.record(z.unknown()).optional().describe(
  "Filtro de busca. Para mensagens: { key: { remoteJid: 'numero@s.whatsapp.net' } }. Para contatos: { id: 'numero@s.whatsapp.net' }"
)
```

### 5. Arquivo: `tools/groups.ts`

11 tools de operacoes de grupo:

| Tool | Metodo | Endpoint | Parametros |
|---|---|---|---|
| `whatsapp_create_group` | POST | `/group/create/:instance` | `instance`, `subject`, `participants` (array de numeros), `description?` |
| `whatsapp_list_groups` | GET | `/group/fetchAllGroups/:instance` | `instance` |
| `whatsapp_group_info` | GET | `/group/findGroupInfos/:instance?groupJid=` | `instance`, `groupJid` |
| `whatsapp_group_participants` | GET | `/group/participants/:instance?groupJid=` | `instance`, `groupJid` |
| `whatsapp_group_invite_code` | GET | `/group/inviteCode/:instance?groupJid=` | `instance`, `groupJid` |
| `whatsapp_group_send_invite` | POST | `/group/sendInvite/:instance` | `instance`, `groupJid`, `numbers` (array) |
| `whatsapp_group_update_participant` | POST | `/group/updateParticipant/:instance` | `instance`, `groupJid`, `participants` (array), `action` (enum: add, remove, promote, demote) |
| `whatsapp_group_update_setting` | POST | `/group/updateSetting/:instance` | `instance`, `groupJid`, `action` (enum: announcement, not_announcement, locked, unlocked) |
| `whatsapp_group_update_subject` | POST | `/group/updateGroupSubject/:instance` | `instance`, `groupJid`, `subject` |
| `whatsapp_group_update_description` | POST | `/group/updateGroupDescription/:instance` | `instance`, `groupJid`, `description` |
| `whatsapp_leave_group` | DELETE | `/group/leaveGroup/:instance?groupJid=` | `instance`, `groupJid` |

#### Nota sobre GET com query params

Tools que usam GET com query params (`groupJid`) devem montar a URL com query string:

```typescript
const client = connectorRegistry.createClient(args.instance);
return await client.get(`/group/findGroupInfos/${args.instance}?groupJid=${args.groupJid}`);
```

### 6. Arquivo: `tools/labels.ts`

2 tools:

| Tool | Metodo | Endpoint | Parametros |
|---|---|---|---|
| `whatsapp_list_labels` | GET | `/label/findLabels/:instance` | `instance` |
| `whatsapp_handle_label` | POST | `/label/handleLabel/:instance` | `instance`, `number`, `labelId`, `action` (enum: add, remove) |

### 7. Arquivo: `tools/instances.ts`

2 tools operacionais:

| Tool | Metodo | Endpoint | Parametros |
|---|---|---|---|
| `whatsapp_connection_state` | GET | `/instance/connectionState/:instance` | `instance` |
| `whatsapp_list_instances` | GET | `/instance/fetchInstances` | `instance` (usado apenas para auth/client, endpoint nao usa instance) |

### 8. Arquivo: `tools/evolution-api.ts` (mantido como fallback)

Renomear a tool de `evolution_api` para `whatsapp_api_raw`. Manter a mesma implementacao. Atualizar a description:

```typescript
description: "Chamada HTTP generica a Evolution API. Use APENAS para operacoes nao cobertas pelas tools especificas do WhatsApp."
```

### 9. Arquivo: `tools/index.ts` (compositor)

```typescript
import { createMessageTools } from "./messages.js";
import { createChatTools } from "./chats.js";
import { createGroupTools } from "./groups.js";
import { createLabelTools } from "./labels.js";
import { createInstanceTools } from "./instances.js";
import { createEvolutionApiTool } from "./evolution-api.js";

export function createEvolutionTools(slugs: [string, ...string[]]): Record<string, any> {
  return {
    ...createMessageTools(slugs),
    ...createChatTools(slugs),
    ...createGroupTools(slugs),
    ...createLabelTools(slugs),
    ...createInstanceTools(slugs),
    ...createEvolutionApiTool(slugs),
  };
}
```

### 10. Arquivo: `connectors/evolution/index.ts` (atualizar)

Alterar `createTools()` para usar `createEvolutionTools` em vez de `createEvolutionApiTool`:

```typescript
import { createEvolutionTools } from "./tools/index.js";

// em evolutionConnector:
createTools(adapters) {
  if (adapters.length === 0) return null;
  const slugs = adapters.map((a) => a.slug) as [string, ...string[]];
  return createEvolutionTools(slugs);
},
```

---

## Limites

### NAO fazer

- NAO tipar respostas da API (retornar JSON cru como hoje — a API pode mudar campos)
- NAO criar tools para operacoes raramente usadas pelo agente: `updatePrivacySettings`, `toggleEphemeral`, `updateProfilePicture`, `updateProfileName`, `updateProfileStatus`, `fetchPrivacySettings`
- NAO remover a tool fallback `whatsapp_api_raw` — ela cobre endpoints nao mapeados
- NAO alterar `client.ts` nem `schemas.ts` — as tools usam o client existente
- NAO alterar o pattern de lazy import do `connectorRegistry`
- NAO criar testes (nao ha framework de teste configurado)
- NAO criar subpastas dentro de `tools/` — manter arquivos flat
- NAO adicionar `.describe()` em ingles — usar portugues em todos os campos

### Observacoes

- O `instance` name no endpoint da Evolution API corresponde ao slug do adapter YAML. O client ja resolve isso via `connectorRegistry.createClient(slug)`.
- A Evolution API usa `apikey` (lowercase) como header de autenticacao — isso ja esta no `client.ts`.
- Endpoints DELETE (como `leaveGroup`) precisam usar `client.get()` com override de metodo, ou adicionar metodo `delete()` no client. Verificar se o client suporta DELETE. Se nao suportar, adicionar `async delete(path: string) { return request("DELETE", path); }` ao client.
- `whatsapp_send_list` e `whatsapp_send_buttons` podem nao funcionar em todas as versoes da API — nao e problema nosso, a tool existe e o LLM pode usar.
- Total de tools: ~35 (10 messages + 10 chats + 11 groups + 2 labels + 2 instances + 1 fallback = 36)

---

## Ordem de Execucao

| Fase | O que | Depende de |
|---|---|---|
| 1a | Criar `tools/messages.ts` (10 tools) | nada |
| 1b | Criar `tools/chats.ts` (10 tools) | nada |
| 1c | Criar `tools/groups.ts` (11 tools) | nada |
| 1d | Criar `tools/labels.ts` (2 tools) | nada |
| 1e | Criar `tools/instances.ts` (2 tools) | nada |
| 2 | Atualizar `tools/evolution-api.ts` (renomear tool para `whatsapp_api_raw`) | nada |
| 3 | Criar `tools/index.ts` (compositor) | fases 1a-1e, 2 |
| 4 | Atualizar `connectors/evolution/index.ts` (usar `createEvolutionTools`) | fase 3 |
| 5 | Adicionar `delete()` ao `client.ts` se necessario | nada |
| 6 | Build check (`npm run build --workspace=apps/backbone`) | fases 3, 4, 5 |

Fases 1a-1e e 2 e 5 sao independentes e podem ser executadas em paralelo.
