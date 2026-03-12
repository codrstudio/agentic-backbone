# Guia: Gestão de Metadata YAML

## Princípios

### Dois tipos de arquivo

| Tipo | Extensão | Conteúdo | Vai para prompt? |
|---|---|---|---|
| Metadata puro | `.yml` | Config, credenciais, flags | Nunca |
| Prompt puro | `.md` | Texto para o agente ler | Sempre |
| Híbrido | `.md` com frontmatter | Metadata + texto | O corpo vai; o frontmatter não |

**Regra:** se o arquivo não tem corpo de texto útil para o agente, ele é `.yml`. Arquivos híbridos existem apenas quando o mesmo recurso tem metadata E conteúdo de prompt (ex: `SKILL.md`, `SERVICE.md`, `ABOUT.md`).

---

## Arquivos de metadata por recurso

| Arquivo | Schema | Descrição |
|---|---|---|
| `AGENT.yml` | `AgentYmlSchema` | Config do agente (enabled, heartbeat, handoff, etc.) |
| `USER.yml` | `UserYmlSchema` | Perfil + credencial do usuário (password auto-criptografado) |
| `CHANNEL.yml` | `ChannelYmlSchema` | Config do canal (adapter, agent, options) |
| `ADAPTER.yml` | `AdapterYmlSchema` | Config de conector (credential, options, policy) |
| `SESSION.yml` | `SessionYmlSchema` | Estado de sessão de conversa |
| `cron/{slug}.yml` | `CronYmlSchema` | Definição de job agendado |

## Arquivos híbridos (frontmatter + corpo)

| Arquivo | Schema do frontmatter | Corpo |
|---|---|---|
| `SKILL.md` | `SkillMdSchema` | Prompt da skill |
| `SERVICE.md` | `ServiceMdSchema` | Prompt do serviço |
| `ABOUT.md` | *(sem schema — corpo puro)* | Perfil narrativo do usuário |

---

## API de leitura e escrita

Todos os acessos a arquivos de metadata passam por `context/readers.ts`. **Nunca use `fs` diretamente** para ler ou escrever metadata.

### Arquivos `.yml` (metadata puro)

#### Criar (arquivo não existe)

```ts
writeYamlAs(path, data, Schema)
```

Valida `data` contra o schema Zod antes de gravar. Falha se o schema não for satisfeito.

#### Atualizar campos específicos (PATCH)

```ts
patchYamlAs(path, patch, Schema)
```

Fluxo interno: `load → merge → validate → save`.

- `patch` contém **apenas os campos que mudaram**
- Todos os outros campos do arquivo ficam intactos
- O schema Zod valida o documento **completo após o merge**
- Retorna o documento atualizado

**Exemplo:**
```ts
// Só altera o displayName. Password e demais campos não são tocados.
patchYamlAs(userYmlPath(slug), { displayName: "Fulano" }, UserYmlSchema);

// Só altera a senha. displayName e demais campos não são tocados.
patchYamlAs(userYmlPath(slug), { password: hash }, UserYmlSchema);
```

#### Ler

```ts
readYamlAs(path, Schema)   // retorna T validado
readYaml(path)             // retorna Record<string, unknown> sem validação (uso interno)
```

---

### Arquivos híbridos `.md` com frontmatter (ex: `SKILL.md`, `SERVICE.md`)

#### Criar (arquivo não existe)

```ts
writeMarkdownAs(path, metadata, body, Schema)
```

Valida `metadata` contra o schema Zod antes de gravar. O `body` é o conteúdo markdown após o frontmatter.

**Exemplo:**
```ts
writeMarkdownAs(mdPath, { name: "Minha Skill", enabled: true }, "# Minha Skill\n", SkillMdSchema);
```

#### Atualizar campos específicos (PATCH)

```ts
patchMarkdownAs(path, patch, Schema, body?)
```

Fluxo interno: `read → merge frontmatter → validate → save`.

- `patch` contém **apenas os campos do frontmatter que mudaram**
- Campos não mencionados no `patch` ficam intactos
- `body` é opcional: se omitido, o corpo atual é preservado; se fornecido, substitui o corpo inteiro
- O schema Zod valida o frontmatter **completo após o merge**
- Campos desconhecidos são descartados pelo schema (sem `.passthrough()`)
- Retorna `{ metadata: T, content: string }`

**Exemplo:**
```ts
// Só altera o name. Body e demais campos do frontmatter não são tocados.
patchMarkdownAs(mdPath, { name: "Novo Nome" }, SkillMdSchema);

// Altera o name E substitui o corpo.
patchMarkdownAs(mdPath, { name: "Novo Nome" }, SkillMdSchema, "# Novo Nome\nConteúdo novo.\n");
```

#### Ler

```ts
readMarkdownAs(path, Schema)   // retorna { metadata: T, content: string } validado
readMarkdown(path)             // retorna { metadata: Record<string,unknown>, content: string } sem validação
```

---

## Encriptação automática

Campos cujo nome contém `key`, `secret`, `token`, `password` ou `pass` são **auto-criptografados** em repouso via AES-256-GCM. O valor é armazenado como `ENC(base64...)`.

- `writeYaml` / `writeYamlAs` / `patchYamlAs` — encriptam na escrita
- `readYaml` / `readYamlAs` — decriptam na leitura
- A chave é derivada de `JWT_SECRET` via scrypt

Isso significa que `USER.yml` pode conter `password` sem risco: o campo nunca aparece em texto claro no disco.

---

## Separação de concerns: USER

O usuário tem dois arquivos com responsabilidades distintas:

| Arquivo | Conteúdo | Quem lê |
|---|---|---|
| `USER.yml` | Metadata + credencial (password encriptado) | `users/manager.ts` — nunca vai para o agente |
| `ABOUT.md` | Perfil narrativo em markdown | `context/resolver.ts` → injetado no prompt do agente |

Updates de senha e updates de perfil são dois `patchYamlAs` separados sobre o mesmo `USER.yml`. A separação é feita na camada de rota/serviço, não no arquivo.

---

## Regras de schema

- **Sem `.passthrough()`** — campos desconhecidos não são aceitos silenciosamente
- Campos variáveis por conector vão em `options: z.record(z.string(), z.unknown())` no schema
- Todo schema tem campos canônicos explícitos; extensões entram em `options`
- `writeYamlAs` e `patchYamlAs` sempre validam o documento completo antes de gravar
