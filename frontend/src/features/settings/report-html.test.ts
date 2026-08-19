import type { ProgressReport } from '../progress/types';
import { buildReportHtml, escapeHtml, formatReportDate } from './report-html';

const t = (key: string, options?: Record<string, unknown>) =>
  options && 'delta' in options ? `${key}:${String(options.delta)}` : key;

function makeReport(overrides: Partial<ProgressReport> = {}): ProgressReport {
  return {
    generatedAt: '2026-08-18',
    period: { from: '2026-07-20', to: '2026-08-18' },
    user: { name: 'Ana', email: 'ana@example.com', memberSince: '2026-01-05' },
    score: { score: 79, previousScore: 73, delta: 6 },
    averages: { calories: 2000, protein: 100, steps: 7500, sleepMinutes: 462 },
    targets: { calories: 2200, protein: 170, steps: 10000, sleepMinutes: 480 },
    body: {
      window: '30d',
      metrics: [{ key: 'weight', unit: 'kg', start: 83, end: 81.6, delta: -1.4 }],
      workouts: { current: 6, previous: 4 },
    },
    tracking: { trackedDays: 12, totalDays: 30, streak: { current: 3, longest: 9 } },
    badges: { earned: 2, total: 10 },
    ...overrides,
  };
}

describe('escapeHtml', () => {
  it('escapes markup-significant characters', () => {
    expect(escapeHtml(`<b>"Ana" & 'co'</b>`)).toBe(
      '&lt;b&gt;&quot;Ana&quot; &amp; &#39;co&#39;&lt;/b&gt;',
    );
  });
});

describe('formatReportDate', () => {
  it('formats ISO dates without Date parsing', () => {
    expect(formatReportDate('2026-08-05')).toBe('05/08/2026');
  });
});

describe('buildReportHtml', () => {
  it('renders the report values', () => {
    const html = buildReportHtml(makeReport(), t);
    expect(html).toContain('79');
    expect(html).toContain('2000 kcal');
    expect(html).toContain('2200 kcal');
    expect(html).toContain('7h 42m'); // sleep average, humanized
    expect(html).toContain('-1.4 kg'); // weight delta
    expect(html).toContain('home.vsLastWeek:+6');
    expect(html).toContain('ana@example.com');
    expect(html).toContain('20/07/2026 — 18/08/2026');
  });

  it('escapes user-provided strings', () => {
    const html = buildReportHtml(
      makeReport({
        user: { name: '<script>x</script>', email: 'a@b.c', memberSince: '2026-01-05' },
      }),
      t,
    );
    expect(html).not.toContain('<script>x</script>');
    expect(html).toContain('&lt;script&gt;x&lt;/script&gt;');
  });

  it('renders dashes for missing targets and averages, and hides a zero delta chip', () => {
    const html = buildReportHtml(
      makeReport({
        score: { score: 0, previousScore: 0, delta: 0 },
        averages: { calories: null, protein: null, steps: null, sleepMinutes: null },
        targets: { calories: null, protein: null, steps: null, sleepMinutes: null },
        body: { window: '30d', metrics: [], workouts: { current: 0, previous: 0 } },
      }),
      t,
    );
    expect(html).toContain('—');
    expect(html).not.toContain('home.vsLastWeek');
  });
});
