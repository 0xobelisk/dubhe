/**
 * LLM provider abstraction. Every mainstream vendor (DeepSeek, OpenAI, Kimi,
 * Qwen, local Ollama...) exposes the OpenAI chat-completions wire format, so
 * one HTTP client covers them all — a provider is just a base URL + key +
 * model. Configured entirely through env vars:
 *
 *   LLM_PROVIDER   deepseek | openai | ollama | custom   (unset → LLM disabled)
 *   LLM_API_KEY    vendor API key (not needed for ollama)
 *   LLM_BASE_URL   override the preset base URL (required for custom)
 *   LLM_MODEL      override the preset model
 *   LLM_TIMEOUT_MS request timeout, default 20000
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMProvider {
  readonly name: string;
  readonly model: string;
  chat(messages: ChatMessage[], opts?: { temperature?: number; maxTokens?: number }): Promise<string>;
}

interface Preset {
  baseUrl: string;
  model: string;
  requiresKey: boolean;
}

const PRESETS: Record<string, Preset> = {
  deepseek: { baseUrl: 'https://api.deepseek.com', model: 'deepseek-chat', requiresKey: true },
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini', requiresKey: true },
  ollama: { baseUrl: 'http://localhost:11434/v1', model: 'llama3.1', requiresKey: false },
  custom: { baseUrl: '', model: '', requiresKey: false }
};

export class OpenAICompatProvider implements LLMProvider {
  readonly name: string;
  readonly model: string;
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;

  constructor(opts: { name: string; baseUrl: string; apiKey: string; model: string; timeoutMs: number }) {
    this.name = opts.name;
    this.baseUrl = opts.baseUrl.replace(/\/$/, '');
    this.apiKey = opts.apiKey;
    this.model = opts.model;
    this.timeoutMs = opts.timeoutMs;
  }

  async chat(
    messages: ChatMessage[],
    opts?: { temperature?: number; maxTokens?: number }
  ): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'content-type': 'application/json',
          ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {})
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: opts?.temperature ?? 0.9,
          max_tokens: opts?.maxTokens ?? 300
        })
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`${this.name} HTTP ${res.status}: ${body.slice(0, 200)}`);
      }
      const data: any = await res.json();
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content !== 'string' || content.length === 0) {
        throw new Error(`${this.name} returned an empty completion`);
      }
      return content;
    } finally {
      clearTimeout(timer);
    }
  }
}

/** Build the provider selected via env vars, or null when LLM is disabled. */
export function createProviderFromEnv(env: NodeJS.ProcessEnv = process.env): LLMProvider | null {
  const which = (env.LLM_PROVIDER ?? '').trim().toLowerCase();
  if (!which) return null;

  const preset = PRESETS[which];
  if (!preset) {
    throw new Error(
      `Unknown LLM_PROVIDER "${which}" — expected one of: ${Object.keys(PRESETS).join(', ')}`
    );
  }

  const baseUrl = env.LLM_BASE_URL ?? preset.baseUrl;
  const model = env.LLM_MODEL ?? preset.model;
  const apiKey = env.LLM_API_KEY ?? '';
  if (!baseUrl) throw new Error('LLM_BASE_URL is required for LLM_PROVIDER=custom');
  if (!model) throw new Error('LLM_MODEL is required for LLM_PROVIDER=custom');
  if (preset.requiresKey && !apiKey) {
    throw new Error(`LLM_API_KEY is required for LLM_PROVIDER=${which}`);
  }

  return new OpenAICompatProvider({
    name: which,
    baseUrl,
    apiKey,
    model,
    timeoutMs: parseInt(env.LLM_TIMEOUT_MS ?? '20000', 10)
  });
}
