# Twilio Typed Tools — Oferecer tools tipadas do Twilio ao agente

## Objetivo

Expandir o conector Twilio de 1 tool (`make_call`) para um conjunto completo de tools tipadas com schemas Zod e `.describe()` em pt-BR — cobrindo SMS, consulta de chamadas, desligar chamada e lookup de numero.

---

## Execution Mode

`implementar`

---

## Contexto

### Estado atual

O conector Twilio (`apps/backbone/src/connectors/twilio/`) tem:
- `client.ts` — cliente HTTP com `makeCall()` apenas
- `tools/make-call.ts` — unica tool, faz chamada outbound via canal `twilio-voice`
- `tools/index.ts` — re-exporta `createTwilioTools` do make-call
- `routes.ts` — webhooks TwiML para voice (voice, gather, status)
- `calls.ts` — tracking de chamadas ativas em memoria (Map)
- `config.ts` — carrega config do canal `twilio-voice`

A tool `make_call` atual usa `findChannelsByAdapter("twilio-voice")` e `loadTwilioConfigFromChannel()` para obter credenciais — nao usa o `connectorRegistry`/adapter YAML como os outros conectores.

### Problema

O agente so consegue fazer chamada. Nao pode enviar SMS, consultar historico de chamadas, desligar uma chamada ativa, ou verificar se um numero e valido. Essas sao operacoes basicas da Twilio REST API que o agente precisa no primeiro release.

### O que muda

| Aspecto | Antes | Depois |
|---|---|---|
| Tools Twilio | 1 (`make_call`) | 7 tools tipadas |
| Client | Apenas `makeCall()` | `makeCall()`, `sendSms()`, `get()`, `post()` |
| Escopo | Apenas voice outbound | Voice + SMS + consultas + lookup |

---

## Especificacao

### 1. Diferenca do padrao Evolution

O conector Twilio usa **config de canal** (`twilio-voice`), nao adapter YAML. As tools novas seguem o mesmo pattern: `findChannelsByAdapter("twilio-voice")` para credenciais. Nao ha `slugs` — o parametro `channelId` (opcional) seleciona o canal.

A Twilio REST API usa form-urlencoded (nao JSON). O client ja tem `authHeader` configurado.

### 2. Expandir `client.ts`

Adicionar metodos genericos ao client para que as tools possam usa-lo:

```typescript
async get(path: string) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${account_sid}${path}`;
  const res = await fetch(url, {
    headers: { Authorization: authHeader },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

async sendSms(params: { to: string; from: string; body: string; mediaUrl?: string }) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${account_sid}/Messages.json`;
  const body = new URLSearchParams();
  body.append("To", params.to);
  body.append("From", params.from);
  body.append("Body", params.body);
  if (params.mediaUrl) body.append("MediaUrl", params.mediaUrl);
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: authHeader, "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
    throw new Error(JSON.stringify(err));
  }
  return await res.json();
}

async updateCall(callSid: string, params: Record<string, string>) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${account_sid}/Calls/${callSid}.json`;
  const body = new URLSearchParams(params);
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: authHeader, "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
    throw new Error(JSON.stringify(err));
  }
  return await res.json();
}
```

### 3. Arquivos de tools (1 por arquivo)

```
apps/backbone/src/connectors/twilio/tools/
  index.ts              ← compositor
  make-call.ts          ← ja existe (manter como esta)
  send-sms.ts
  hangup-call.ts
  list-calls.ts
  get-call.ts
  list-messages.ts
  lookup-number.ts
```

### 4. Helper: resolver config do canal

Todas as tools precisam de credenciais Twilio. Extrair um helper reutilizavel em `tools/_resolve-config.ts`:

```typescript
import { findChannelsByAdapter } from "../../../channels/lookup.js";
import { loadTwilioConfigFromChannel } from "../config.js";
import type { TwilioConfig } from "../types.js";

export function resolveTwilioConfig(channelId?: string): TwilioConfig {
  const channels = findChannelsByAdapter("twilio-voice");
  const channel = channelId
    ? channels.find((ch) => ch.slug === channelId)
    : channels[0];
  if (!channel) throw new Error("Nenhum canal twilio-voice configurado");
  return loadTwilioConfigFromChannel(channel);
}
```

### 5. Detalhes de cada tool

#### `send_sms` — `tools/send-sms.ts`

```
POST https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Messages.json
```

| Parametro | Tipo | Obrigatorio | Descricao |
|---|---|---|---|
| `to` | string | sim | Numero destino E.164 (ex: +5532988887777) |
| `body` | string | sim | Texto do SMS |
| `mediaUrl` | string | nao | URL de midia para MMS |
| `channelId` | string | nao | Slug do canal twilio-voice (usa primeiro disponivel se omitido) |

O `From` vem do `config.phoneNumber` do canal.

#### `hangup_call` — `tools/hangup-call.ts`

```
POST https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Calls/{CallSid}.json
Body: Status=completed
```

| Parametro | Tipo | Obrigatorio | Descricao |
|---|---|---|---|
| `callSid` | string | sim | SID da chamada a encerrar |
| `channelId` | string | nao | Slug do canal twilio-voice |

Apos desligar via API, tambem chamar `removeCall(callSid)` do `calls.ts` para limpar o tracking local.

#### `list_calls` — `tools/list-calls.ts`

```
GET https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Calls.json
```

| Parametro | Tipo | Obrigatorio | Descricao |
|---|---|---|---|
| `status` | enum: queued, ringing, in-progress, completed, busy, no-answer, canceled, failed | nao | Filtrar por status |
| `to` | string | nao | Filtrar por numero destino |
| `from` | string | nao | Filtrar por numero origem |
| `limit` | number | nao | Limite de resultados (default 20, max 100) |
| `channelId` | string | nao | Slug do canal twilio-voice |

Query params montados na URL: `?Status=x&To=x&From=x&PageSize=x`

#### `get_call` — `tools/get-call.ts`

```
GET https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Calls/{CallSid}.json
```

| Parametro | Tipo | Obrigatorio | Descricao |
|---|---|---|---|
| `callSid` | string | sim | SID da chamada |
| `channelId` | string | nao | Slug do canal twilio-voice |

#### `list_messages` — `tools/list-messages.ts`

```
GET https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Messages.json
```

| Parametro | Tipo | Obrigatorio | Descricao |
|---|---|---|---|
| `to` | string | nao | Filtrar por numero destino |
| `from` | string | nao | Filtrar por numero origem |
| `dateSentAfter` | string | nao | Data minima ISO 8601 (ex: 2026-03-01T00:00:00Z) |
| `limit` | number | nao | Limite de resultados (default 20, max 100) |
| `channelId` | string | nao | Slug do canal twilio-voice |

Query params: `?To=x&From=x&DateSent>=x&PageSize=x`

#### `lookup_number` — `tools/lookup-number.ts`

```
GET https://lookups.twilio.com/v2/PhoneNumbers/{number}
```

| Parametro | Tipo | Obrigatorio | Descricao |
|---|---|---|---|
| `number` | string | sim | Numero E.164 a consultar (ex: +5532988887777) |
| `channelId` | string | nao | Slug do canal twilio-voice |

Retorna: tipo de linha (mobile/landline/voip), carrier, pais. Usa o mesmo `authHeader` do client.

**Nota:** O Lookup API usa base URL diferente (`lookups.twilio.com`), nao o `api.twilio.com`. A tool faz fetch direto com authHeader do config, sem passar pelo client.

### 6. Compositor `tools/index.ts`

```typescript
import { createMakeCallTool } from "./make-call.js";
import { createSendSmsTool } from "./send-sms.js";
import { createHangupCallTool } from "./hangup-call.js";
import { createListCallsTool } from "./list-calls.js";
import { createGetCallTool } from "./get-call.js";
import { createListMessagesTool } from "./list-messages.js";
import { createLookupNumberTool } from "./lookup-number.js";

export function createTwilioTools(): Record<string, any> | null {
  const { findChannelsByAdapter } = await import("../../../channels/lookup.js");
  const channels = findChannelsByAdapter("twilio-voice");
  if (channels.length === 0) return null;

  return {
    ...createMakeCallTool(),
    ...createSendSmsTool(),
    ...createHangupCallTool(),
    ...createListCallsTool(),
    ...createGetCallTool(),
    ...createListMessagesTool(),
    ...createLookupNumberTool(),
  };
}
```

### 7. Refatorar `make-call.ts`

A tool `make_call` atual exporta `createTwilioTools()` — renomear o export para `createMakeCallTool()` e manter a mesma implementacao. O `index.ts` passa a ser o compositor.

### 8. Atualizar `connectors/twilio/index.ts`

Nenhuma mudanca necessaria — `createTools()` ja chama `createTwilioTools()` do index.

---

## Limites

### NAO fazer

- NAO tipar respostas da Twilio API (retornar JSON cru)
- NAO criar tools para operacoes administrativas (comprar numero, configurar webhook, etc.)
- NAO alterar os webhooks TwiML existentes (`routes.ts`)
- NAO alterar o flow de voice (`calls.ts`, `twiml.ts`)
- NAO alterar `schemas.ts` nem `config.ts`
- NAO criar testes
- NAO alterar como `make_call` funciona internamente — apenas renomear o export
- NAO usar adapter YAML / `connectorRegistry` — manter o pattern de canal existente

### Observacoes

- Twilio REST API usa form-urlencoded para POST e query params para GET — diferente da Evolution API (JSON)
- Numeros devem estar em formato E.164 com `+` (diferente do WhatsApp que usa sem `+`)
- O `account_sid` e `auth_token` vem do canal, nao de adapter YAML
- Lookup API (`lookups.twilio.com/v2`) tem base URL diferente da API principal (`api.twilio.com`)
- `hangup_call` precisa limpar o tracking local alem de chamar a API

---

## Ordem de Execucao

| Fase | O que | Depende de |
|---|---|---|
| 1 | Criar `tools/_resolve-config.ts` (helper) | nada |
| 2 | Expandir `client.ts` (`get`, `sendSms`, `updateCall`) | nada |
| 3 | Refatorar `make-call.ts` (renomear export para `createMakeCallTool`) | nada |
| 4a | Criar `tools/send-sms.ts` | fase 1 |
| 4b | Criar `tools/hangup-call.ts` | fase 1 |
| 4c | Criar `tools/list-calls.ts` | fase 1, 2 |
| 4d | Criar `tools/get-call.ts` | fase 1, 2 |
| 4e | Criar `tools/list-messages.ts` | fase 1, 2 |
| 4f | Criar `tools/lookup-number.ts` | fase 1 |
| 5 | Criar `tools/index.ts` (compositor) | fases 3, 4a-4f |
| 6 | Build check | fase 5 |

Fases 1, 2, 3 sao independentes. Fases 4a-4f sao independentes entre si.
