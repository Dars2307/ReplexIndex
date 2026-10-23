// Asks one model which packages it would install for a task.
// Every provider gets the same plain question, with no web access: this
// measures what the model knows, which is what an agent relies on when it
// picks a dependency without looking anything up.
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import type { Task } from './tasks.ts';

export interface Pick {
  package: string;
  why: string;
}

export interface Answer {
  picks: Pick[];
  refused?: string;
}

export const question = (t: Task) =>
  `I'm working on a ${t.ecosystem === 'npm' ? 'JavaScript/TypeScript project (npm)' : 'Python project (PyPI)'}. I need to: ${t.task}.\n` +
  `Which package should I install? Give your top 3 picks, best first, as exact ${t.ecosystem === 'npm' ? 'npm' : 'PyPI'} package names, each with a one-line reason.`;

const PicksSchema = z.object({
  picks: z.array(z.object({ package: z.string(), why: z.string() })),
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Gemini (REST, same endpoint the Replex server uses)
// ---------------------------------------------------------------------------
async function askGemini(model: string, t: Task): Promise<Answer> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not set');
  const body = JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: question(t) }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: { picks: { type: 'ARRAY', items: { type: 'OBJECT', properties: { package: { type: 'STRING' }, why: { type: 'STRING' } }, required: ['package', 'why'] } } },
        required: ['picks'],
      },
      maxOutputTokens: 4096,
    },
  });
  // Stay on the requested model: falling back to another would mix results.
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
      body,
      signal: AbortSignal.timeout(60_000),
    }).catch(() => null);
    if (res?.ok) {
      const json = await res.json();
      const text = json?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? '';
      return PicksSchema.parse(JSON.parse(text));
    }
    if (res && ![429, 500, 503].includes(res.status)) throw new Error(`Gemini HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    await sleep(5000 * (attempt + 1));
  }
  throw new Error(`Gemini ${model} unavailable after 5 attempts`);
}

// ---------------------------------------------------------------------------
// Claude (official SDK, structured output)
// ---------------------------------------------------------------------------
let anthropic: Anthropic | null = null;

async function askClaude(model: string, t: Task): Promise<Answer> {
  anthropic ??= new Anthropic();
  // No refusal fallback on purpose: a fallback would answer with a different
  // model and blur what this model recommends. Refusals are recorded instead.
  const response = await anthropic.messages.parse({
    model,
    max_tokens: 16000,
    output_config: { effort: 'medium', format: zodOutputFormat(PicksSchema) },
    messages: [{ role: 'user', content: question(t) }],
  });
  if (response.stop_reason === 'refusal') return { picks: [], refused: response.stop_details?.category ?? 'refusal' };
  if (!response.parsed_output) throw new Error(`Claude returned no parsable output (stop_reason: ${response.stop_reason})`);
  return response.parsed_output;
}

export type Provider = 'gemini' | 'claude';

export function ask(provider: Provider, model: string, t: Task): Promise<Answer> {
  return provider === 'gemini' ? askGemini(model, t) : askClaude(model, t);
}
