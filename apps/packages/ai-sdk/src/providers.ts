import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export interface AiProviderConfig {
  /** Default API key (used for openrouter) */
  apiKey: string;
  /** Aliases de modelo: nome amigavel → model ID completo */
  aliases?: Record<string, string>;
  /** Additional providers by name (e.g. groq) */
  providers?: Record<string, { baseURL: string; apiKey: string }>;
}

const DEFAULT_ALIASES: Record<string, string> = {
  "fast": "anthropic/claude-haiku-4.5",
  "balanced": "anthropic/claude-sonnet-4",
  "strong": "anthropic/claude-opus-4.6",
};

export function createAiProviderRegistry(config: AiProviderConfig) {
  const aliases = { ...DEFAULT_ALIASES, ...config.aliases };
  const instances = new Map<string, ReturnType<typeof createOpenAICompatible>>();

  function getProvider(name: string) {
    const cached = instances.get(name);
    if (cached) return cached;

    const extra = config.providers?.[name];
    if (extra) {
      const p = createOpenAICompatible({ name, baseURL: extra.baseURL, apiKey: extra.apiKey });
      instances.set(name, p);
      return p;
    }

    // Default: openrouter
    const p = createOpenAICompatible({
      name: "openrouter",
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: config.apiKey,
    });
    instances.set(name, p);
    return p;
  }

  return {
    /** Resolve modelo por ID ou alias, opcionalmente de um provider especifico */
    model(nameOrAlias: string, provider?: string) {
      const resolved = aliases[nameOrAlias] ?? nameOrAlias;
      return getProvider(provider ?? "openrouter")(resolved);
    },
    /** Aliases registrados */
    aliases,
  };
}
