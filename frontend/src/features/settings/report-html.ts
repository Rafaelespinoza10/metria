import { formatMinutes } from '../progress/chart-helpers';
import { formatDelta } from '../progress/helpers';
import type { ProgressReport } from '../progress/types';

/** i18next-compatible translator; injected so the builder stays pure and testable. */
export type ReportTranslator = (key: string, options?: Record<string, unknown>) => string;

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** "2026-08-05" → "05/08/2026" — no Date parsing, so no timezone drift. */
export function formatReportDate(dateISO: string): string {
  const [year, month, day] = dateISO.split('-');
  return `${day}/${month}/${year}`;
}

function cell(value: number | null, format: (value: number) => string): string {
  return value === null ? '—' : format(value);
}

interface AverageRow {
  label: string;
  average: number | null;
  target: number | null;
  format: (value: number) => string;
}

/**
 * Print-styled HTML for the 30-day progress report, rendered to PDF on-device by
 * expo-print. Charcoal on white with the brand orange as the only accent; every
 * user-provided string is escaped.
 */
export function buildReportHtml(report: ProgressReport, t: ReportTranslator): string {
  const integer = (value: number) => `${Math.round(value)}`;
  const grams = (value: number) => `${Math.round(value)} g`;
  const kcal = (value: number) => `${Math.round(value)} kcal`;

  const averageRows: AverageRow[] = [
    {
      label: t('nutrition.calories'),
      average: report.averages.calories,
      target: report.targets.calories,
      format: kcal,
    },
    {
      label: t('nutrition.protein'),
      average: report.averages.protein,
      target: report.targets.protein,
      format: grams,
    },
    {
      label: t('activity.steps'),
      average: report.averages.steps,
      target: report.targets.steps,
      format: integer,
    },
    {
      label: t('sleep.title'),
      average: report.averages.sleepMinutes,
      target: report.targets.sleepMinutes,
      format: formatMinutes,
    },
  ];

  const averagesHtml = averageRows
    .map(
      (row) => `<tr>
        <td>${escapeHtml(row.label)}</td>
        <td class="num">${cell(row.average, row.format)}</td>
        <td class="num muted">${cell(row.target, row.format)}</td>
      </tr>`,
    )
    .join('');

  const bodyHtml = report.body.metrics
    .map((metric) => {
      const withUnit = (value: number) => `${value} ${metric.unit}`;
      return `<tr>
        <td>${escapeHtml(t(`measurements.type.${metric.key}`))}</td>
        <td class="num">${cell(metric.start, withUnit)}</td>
        <td class="num">${cell(metric.end, withUnit)}</td>
        <td class="num strong">${metric.delta === null ? '—' : (formatDelta(metric.delta, metric.unit) ?? `0 ${metric.unit}`)}</td>
      </tr>`;
    })
    .join('');

  const scoreDelta = formatDelta(report.score.delta);

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, 'Helvetica Neue', Helvetica, Roboto, sans-serif;
    color: #1e1b16;
    padding: 48px 44px;
    font-size: 13px;
    line-height: 1.5;
  }
  .brand { font-size: 13px; font-weight: 800; letter-spacing: 4px; color: #f08343; }
  h1 { font-size: 26px; font-weight: 800; letter-spacing: -0.5px; margin-top: 6px; }
  .meta { color: #6f675c; margin-top: 4px; }
  .score { display: flex; align-items: baseline; gap: 16px; margin-top: 28px;
           padding: 20px 24px; border: 1px solid #eee7dc; border-radius: 16px; }
  .score .value { font-size: 56px; font-weight: 800; letter-spacing: -2px; }
  .score .of { color: #a89f92; font-size: 14px; }
  .score .delta { color: #f08343; font-weight: 700; margin-left: auto; }
  h2 { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px;
       color: #6f675c; margin: 30px 0 8px; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 1px;
       color: #a89f92; font-weight: 600; padding: 6px 0; }
  th.num, td.num { text-align: right; }
  td { padding: 8px 0; border-top: 1px solid #f0eae1; }
  .strong { font-weight: 700; }
  .muted { color: #6f675c; }
  .facts { display: flex; gap: 12px; }
  .fact { flex: 1; border: 1px solid #eee7dc; border-radius: 12px; padding: 12px 14px; }
  .fact .value { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
  .fact .label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #a89f92; }
  footer { margin-top: 36px; padding-top: 12px; border-top: 1px solid #f0eae1;
           color: #a89f92; font-size: 10px; }
</style>
</head>
<body>
  <header>
    <div class="brand">METRIA</div>
    <h1>${escapeHtml(t('report.title'))}</h1>
    <p class="meta">${formatReportDate(report.period.from)} — ${formatReportDate(report.period.to)}</p>
    <p class="meta">${escapeHtml(t('report.preparedFor'))}: ${escapeHtml(report.user.name)} · ${escapeHtml(report.user.email)}</p>
  </header>

  <section class="score">
    <div>
      <span class="value">${report.score.score}</span>
      <span class="of">/ 100</span>
    </div>
    <div>${escapeHtml(t('home.progressScore'))}</div>
    ${scoreDelta !== null ? `<div class="delta">${escapeHtml(t('home.vsLastWeek', { delta: scoreDelta }))}</div>` : ''}
  </section>

  <h2>${escapeHtml(t('report.dailyAverages'))}</h2>
  <table>
    <tr>
      <th>${escapeHtml(t('report.metric'))}</th>
      <th class="num">${escapeHtml(t('home.average'))}</th>
      <th class="num">${escapeHtml(t('home.target'))}</th>
    </tr>
    ${averagesHtml}
  </table>

  <h2>${escapeHtml(t('home.bodyProgress'))}</h2>
  <table>
    <tr>
      <th>${escapeHtml(t('report.metric'))}</th>
      <th class="num">${escapeHtml(t('report.start'))}</th>
      <th class="num">${escapeHtml(t('report.end'))}</th>
      <th class="num">${escapeHtml(t('report.change'))}</th>
    </tr>
    ${bodyHtml}
  </table>

  <h2>${escapeHtml(t('report.consistency'))}</h2>
  <div class="facts">
    <div class="fact">
      <div class="value">${report.tracking.trackedDays}<span class="of">/${report.tracking.totalDays}</span></div>
      <div class="label">${escapeHtml(t('report.trackedDays'))}</div>
    </div>
    <div class="fact">
      <div class="value">${report.body.workouts.current}</div>
      <div class="label">${escapeHtml(t('home.workoutCount'))}</div>
    </div>
    <div class="fact">
      <div class="value">${report.tracking.streak.current}</div>
      <div class="label">${escapeHtml(t('report.currentStreak'))}</div>
    </div>
    <div class="fact">
      <div class="value">${report.badges.earned}<span class="of">/${report.badges.total}</span></div>
      <div class="label">${escapeHtml(t('report.badges'))}</div>
    </div>
  </div>

  <footer>
    ${escapeHtml(t('report.generatedOn', { date: formatReportDate(report.generatedAt) }))} ·
    ${escapeHtml(t('settings.memberSince', { date: formatReportDate(report.user.memberSince) }))} ·
    ${escapeHtml(t('report.disclaimer'))}
  </footer>
</body>
</html>`;
}
