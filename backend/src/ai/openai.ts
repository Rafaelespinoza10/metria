import OpenAI from 'openai';
import { env } from '../config/env.js';
import { AppError } from '../shared/errors/app-error.js';
import type {
  AlternativesInput,
  InsightAggregatesInput,
  InsightsPort,
  MealAlternativesPort,
  MealImageInput,
  MealVisionPort,
} from './ports.js';

const VISION_SYSTEM_PROMPT = `You estimate the nutritional content of a meal from one photo.
Respond ONLY with JSON: {"foods":[{"name":string,"estimatedGrams":number,"calories":number,"protein":number,"carbohydrates":number,"fat":number,"micronutrients":{[key:string]:number}|null,"confidence":number 0-1}],"overallConfidence":number 0-1,"notes":string|null}.
Rules: values are rough estimates from visual portion size; confidence reflects real uncertainty (never above 0.95); food names in the requested language; include micronutrients (e.g. fiber_g, sodium_mg) only when reasonably inferable; never give medical or diagnostic statements.`;

const ALTERNATIVES_SYSTEM_PROMPT = `You suggest 2-4 healthier or goal-aligned alternatives to a meal.
Respond ONLY with JSON: {"suggestions":[{"title":string,"description":string}]}.
Rules: small, practical lifestyle swaps aligned with the user's goals; keep descriptions to one or two sentences in the requested language; never give medical advice, diagnoses, or prescriptions.`;

let cachedClient: OpenAI | null = null;

function requireClient(): OpenAI {
  if (!env.OPENAI_API_KEY) {
    throw new AppError('AI_UNAVAILABLE', 'AI features are not configured', 503);
  }
  // One shared client; a bounded timeout so a hung upstream can't hold the
  // mobile request open indefinitely.
  cachedClient ??= new OpenAI({ apiKey: env.OPENAI_API_KEY, timeout: 30_000, maxRetries: 1 });
  return cachedClient;
}

async function completeJson(
  client: OpenAI,
  system: string,
  userContent: OpenAI.Chat.ChatCompletionContentPart[],
): Promise<unknown> {
  const response = await client.chat.completions.create({
    model: env.OPENAI_MODEL,
    response_format: { type: 'json_object' },
    max_tokens: 1500,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: userContent },
    ],
  });
  const content = response.choices[0]?.message.content;
  if (!content) throw new AppError('AI_UNAVAILABLE', 'Empty AI response', 503);
  try {
    return JSON.parse(content) as unknown;
  } catch {
    // Truncated or malformed model output is an availability problem, not a 500.
    throw new AppError('AI_UNAVAILABLE', 'AI returned an unusable response', 503);
  }
}

export class OpenAIMealVision implements MealVisionPort {
  async analyzeMealImage(input: MealImageInput): Promise<unknown> {
    const client = requireClient();
    return completeJson(client, VISION_SYSTEM_PROMPT, [
      {
        type: 'text',
        text: `Estimate this meal. Food names in language: ${input.locale}.`,
      },
      {
        type: 'image_url',
        image_url: { url: `data:${input.mimeType};base64,${input.data.toString('base64')}` },
      },
    ]);
  }
}

export class OpenAIMealAlternatives implements MealAlternativesPort {
  async suggestAlternatives(input: AlternativesInput): Promise<unknown> {
    const client = requireClient();
    return completeJson(client, ALTERNATIVES_SYSTEM_PROMPT, [
      {
        type: 'text',
        text: JSON.stringify({
          language: input.locale,
          meal: input.mealName,
          items: input.items,
          activeGoals: input.goals,
        }),
      },
    ]);
  }
}

const INSIGHTS_SYSTEM_PROMPT = `You interpret pre-computed wellness aggregates for a personal tracking app.
Respond ONLY with JSON: {"content":string}.
Rules: 2-4 short sentences in the requested language; interpret trends and patterns from the provided numbers ONLY — never recalculate, never invent values; calm, specific, encouraging tone without exclamation marks; suggest at most one small lifestyle adjustment; never give medical advice, diagnoses, or prescriptions.`;

export class OpenAIInsights implements InsightsPort {
  async generateInsight(input: InsightAggregatesInput): Promise<unknown> {
    const client = requireClient();
    return completeJson(client, INSIGHTS_SYSTEM_PROMPT, [
      {
        type: 'text',
        text: JSON.stringify({
          language: input.locale,
          period: input.period,
          aggregates: input.aggregates,
        }),
      },
    ]);
  }
}
