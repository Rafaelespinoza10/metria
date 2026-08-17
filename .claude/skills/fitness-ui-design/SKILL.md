---
name: fitness-ui-design
description: Mandatory design direction for ALL Metria frontend UI work — screens, components, styling, navigation chrome, empty/loading states. Dribbble-quality fitness app aesthetic (dark-first, bold metric typography, editorial layouts) built with NativeWind 4 + Reanimated 4 on Expo. Use BEFORE writing or editing any .tsx that renders UI in frontend/.
---

# Metria Fitness UI — Design Direction

Metria's UI must look like a top Dribbble/Mobbin fitness app shot — opinionated,
editorial, data-forward — never like generic AI output. Read this fully before
writing any screen or component. Stack: Expo SDK 57, NativeWind 4 (Tailwind
classes via `className`), Reanimated 4, React Navigation native-stack.

## The look (commit to it)

**Dark-first, high-contrast, metric-driven.** Near-black surfaces, one vivid
accent (brand emerald), oversized numbers as the visual heroes, generous
rounding, tight editorial spacing. Think Whoop / Oura / Nike Training Club —
not a Bootstrap dashboard.

- Backgrounds: layered dark neutrals (`ink` scale below), never pure `#000`
  and never plain white screens. Light mode can come later; design dark.
- One accent: brand emerald `#10B981` for progress, CTAs, active states.
  Semantic metric colors (below) are the ONLY other saturated colors allowed.
- Numbers are the interface. Big stat = huge tight numerals + small uppercase
  label + unit in muted color. The number, not an icon, carries the card.
- Depth via layering (surface tiers + subtle borders `border-white/5`), not
  drop shadows. Shadows render poorly on Android.
- Corners: cards `rounded-3xl`, chips/buttons `rounded-full` or `rounded-2xl`.
  Never mix radii randomly on one screen.

## Anti-AI-look rules (hard bans)

These are the tells that scream "generated". Never ship them:

- ❌ Everything vertically centered on the screen (`flex-1 items-center
  justify-center` as a layout). Content starts at the top, aligned left.
- ❌ Uniform grids of identical cards. Vary card sizes: one hero card, then
  supporting cards in a 2-col row, then a horizontal scroller.
- ❌ Emoji as icons, 🎉 in copy, exclamation-heavy microcopy ("Great job!!").
  Copy is calm and specific: "12 min más que tu promedio".
- ❌ Purple/indigo gradients on white, `text-slate-600` gray-on-white body
  text, default blue links — the generic AI palette.
- ❌ Centered `text-lg` paragraph under a centered title as a "tagline".
- ❌ Same padding everywhere. Rhythm: screen gutter `px-5`, section gap
  `mt-8`, intra-card `gap-3`.
- ❌ Placeholder-looking empty states ("No data yet."). Empty states get an
  illustration-weight treatment: big dimmed numeral or ring at 0, one line of
  useful copy, one CTA.

## Design tokens

On the FIRST UI task, extend `frontend/tailwind.config.js` (and mirror in
`frontend/src/theme/index.ts` — the file header requires keeping them in sync):

```js
colors: {
  brand: { DEFAULT: '#10B981', dark: '#047857', soft: 'rgba(16,185,129,0.14)' },
  ink: {
    950: '#0A0F0D', // screen background
    900: '#111815', // card surface
    800: '#1A2420', // elevated surface / pressed
    700: '#27332E', // borders, dividers (or use border-white/5)
  },
  metric: {
    move: '#F97316',   // calories / activity
    heart: '#F43F5E',  // heart rate / effort
    sleep: '#818CF8',  // sleep / recovery
    hydro: '#38BDF8',  // hydration
    protein: '#FACC15',// nutrition
  },
  content: {
    primary: '#F4F7F5',
    secondary: '#9BA8A1',
    tertiary: '#5C6B64',
  },
},
```

Typography scale (system font is fine — weight and tracking do the work):

- Hero metric: `text-6xl font-extrabold tracking-tighter text-content-primary`
  with unit as `text-base font-medium text-content-secondary` baseline-aligned.
- Card metric: `text-3xl font-bold tracking-tight`.
- Section title: `text-lg font-semibold text-content-primary`, often paired
  with a right-aligned "Ver todo" in `text-sm text-brand`.
- Labels: `text-xs font-semibold uppercase tracking-widest text-content-tertiary`.
- Body: `text-sm text-content-secondary leading-relaxed`. Never long paragraphs.

## Composition patterns

Every screen picks from these; don't invent flat lists of same-size boxes.

1. **Header**: greeting/date small on top-left (`text-sm text-content-secondary`),
   screen title huge below (`text-3xl font-bold`), avatar or icon button
   top-right. Inside `SafeAreaView` from `react-native-safe-area-context`.
2. **Hero card**: one full-width `bg-ink-900 rounded-3xl p-5` card with the
   day's headline metric + progress ring or bar. This anchors the screen.
3. **Stat duo/trio**: `flex-row gap-3` of smaller cards, each with a metric
   color dot/icon, big number, tiny label. Different heights are fine.
4. **Horizontal scroller**: `FlatList horizontal` of workout/recipe cards
   (`w-64`), peeking next card, `showsHorizontalScrollIndicator={false}`.
5. **Progress**: rings and bars, always track (`bg-white/10`) + fill in the
   metric color. Bars `h-2 rounded-full`. Rings via SVG or Reanimated later.
6. **Primary CTA**: full-width `bg-brand rounded-2xl py-4` with
   `text-ink-950 font-semibold text-center` (dark text on emerald — check
   contrast, never white-on-emerald for body-size text).
7. **List rows**: `flex-row items-center gap-4 py-3` with leading icon in a
   `h-11 w-11 rounded-2xl bg-brand-soft items-center justify-center` tile,
   title + subtitle stack, trailing value or chevron. Divide with
   `border-b border-white/5`, not gaps.

## Motion (Reanimated 4)

Motion is part of the premium feel, but restrained:

- Screen entrance: stagger sections with `entering={FadeInDown.delay(i * 60).springify()}`.
- Press feedback: `Pressable` + scale to `0.97` with a spring — every tappable
  card and button. No opacity-only feedback.
- Progress bars/rings animate from 0 to value on mount (`withSpring` /
  `withTiming`, ~600ms, easing out).
- Nothing loops or bounces idle. No confetti.

## Implementation rules

- NativeWind `className` everywhere; `StyleSheet`/inline style only for what
  Tailwind can't express (transforms in animated styles, SVG props).
- Check https://docs.expo.dev/versions/v57.0.0/ before using any Expo API
  (per frontend/AGENTS.md). Prefer built-ins; don't add UI-kit dependencies
  (no react-native-paper, no gluestack). Icons: `@expo/vector-icons` (ships
  with Expo) — prefer Ionicons outline set, size 20–24, one style per screen.
- All copy through i18next (`en.json` + `es.json`) — never hardcoded strings.
- `expo-status-bar` set to `style="light"` on dark screens.
- Loading states are skeletons shaped like the real layout (`bg-ink-800
  rounded-3xl` blocks with a subtle opacity pulse), never a centered spinner.

## Pre-ship checklist

Before finishing any screen, verify:

- [ ] Would this hold up as a Dribbble shot? (hierarchy obvious at a glance,
      one hero element, intentional whitespace)
- [ ] Zero hard-ban violations from the anti-AI list.
- [ ] Colors come only from the tokens above; text on emerald is dark.
- [ ] Every tappable has press feedback; sections have entrance animation.
- [ ] Empty + loading states designed, not defaulted.
- [ ] Strings in both locale files; `npm run typecheck && npm run lint` pass.
