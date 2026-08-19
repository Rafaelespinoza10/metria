import { describe, expect, it } from 'vitest';
import { jsonCompletionParams } from './openai.js';

describe('jsonCompletionParams', () => {
  const params = jsonCompletionParams('system prompt', [{ type: 'text', text: 'hello' }]);

  it('caps the answer with max_completion_tokens, never max_tokens', () => {
    // Current models reject `max_tokens` outright, which surfaced as a blanket
    // AI_UNAVAILABLE on every insight and meal analysis.
    expect(params).not.toHaveProperty('max_tokens');
    expect(params.max_completion_tokens).toBeGreaterThan(0);
  });

  it('leaves room for a reasoning model to think before it writes', () => {
    // A meal photo spends ~400 reasoning tokens plus ~600 of JSON; a 1500 ceiling
    // left almost no headroom for a busier plate.
    expect(params.max_completion_tokens).toBeGreaterThanOrEqual(3000);
  });

  it('asks for a JSON object and passes both messages through', () => {
    expect(params.response_format).toEqual({ type: 'json_object' });
    expect(params.messages).toEqual([
      { role: 'system', content: 'system prompt' },
      { role: 'user', content: [{ type: 'text', text: 'hello' }] },
    ]);
  });
});
