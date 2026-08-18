---
name: fitness-ui-design
description: Mandatory design direction for ALL Metria frontend UI work — screens, components, styling, navigation chrome, empty/loading states. Warm, editorial "AI nutrition assistant" aesthetic (cream surfaces, white cards, orange accent, charcoal CTAs, bold metric typography) built with NativeWind 4 + Reanimated 4 on Expo. Use BEFORE writing or editing any .tsx that renders UI in frontend/.
---

# Metria Fitness UI — Design Direction

Metria's UI must look like a top Dribbble/Mobbin nutrition-app shot — warm,
editorial, data-forward — never like generic AI output. Read this fully before
writing any screen or component. Stack: Expo SDK 57, NativeWind 4 (Tailwind
classes via `className`), Reanimated 4, React Navigation native-stack.

## The look (commit to it)

**Warm light, high-contrast, metric-driven.** Cream screen backgrounds, white
cards, one vivid orange accent, charcoal for primary actions and headline
text, oversized numbers as the visual heroes, generous rounding. Think a
premium "personal AI nutrition assistant": soft, appetizing, calm.

- Backgrounds: warm cream (`ink-950` token = #F2EDE5), never pure white
  screens and never gray. Cards are pure white (`ink-900`) on the cream —
  depth comes from that two-tier contrast plus hairline borders
  (`border-black/5`), not drop shadows.
- One accent: warm orange `brand` (#F08343) for progress fills, active states,
  selected chips, icon tiles, and highlights. Semantic metric colors (below)
  are the ONLY other saturated colors allowed.
- **Primary CTAs are charcoal** (`bg-charcoal` + `text-white`), like the
  reference's "Get Started" button — orange is for accents and progress, not
  for big buttons. Destructive stays `metric-heart` with white text.
- Numbers are the interface. Big stat = huge tight numerals in
  `text-content-primary` + small uppercase label + unit in muted color.
- Corners: cards `rounded-3xl`, chips/buttons `rounded-full` or `rounded-2xl`.
  Never mix radii randomly on one screen.
- Status bar: `style="dark"` (dark icons on cream).

## Anti-AI-look rules (hard bans)

These are the tells that scream "generated". Never ship them:

- ❌ Everything vertically centered on the screen (`flex-1 items-center
  justify-center` as a layout). Content starts at the top, aligned left.
- ❌ Uniform grids of identical cards. Vary card sizes: one hero card, then
  supporting cards in a 2-col row, then a horizontal scroller.
- ❌ Emoji as icons, 🎉 in copy, exclamation-heavy microcopy ("Great job!!").
  Copy is calm and specific: "12 min más que tu promedio".
- ❌ Purple/indigo gradients, `text-slate-600` gray-on-white body text,
  default blue links — the generic AI palette.
- ❌ Centered `text-lg` paragraph under a centered title as a "tagline".
- ❌ Same padding everywhere. Rhythm: screen gutter `px-5`, section gap
  `mt-8`, intra-card `gap-3`.
- ❌ Placeholder-looking empty states ("No data yet."). Empty states get an
  illustration-weight treatment: big dimmed numeral or ring at 0, one line of
  useful copy, one CTA.

## Design tokens

Defined in `frontend/tailwind.config.js` and mirrored in
`frontend/src/theme/index.ts` — keep the two in sync. The `ink` scale keeps
its historical name but now holds the light surface tiers:

```js
colors: {
  brand: { DEFAULT: '#F08343', dark: '#D96A2B', soft: '#FBE7D8' },
  charcoal: { DEFAULT: '#1E1B16', soft: '#2A261F' },  // primary CTAs, dark chrome
  ink: {
    950: '#F2EDE5', // screen background (warm cream)
    900: '#FFFFFF', // card surface
    800: '#EDE6DC', // elevated / pressed / skeleton
    700: '#E2DACE', // strong borders, dividers (or use border-black/5)
  },
  metric: {
    move: '#F08343',   // calories / activity (same family as brand)
    heart: '#E25C5C',  // effort / destructive
    sleep: '#7B6FE0',  // sleep / recovery
    hydro: '#3BA7DC',  // hydration / steps
    protein: '#DB9E00',// nutrition
  },
  content: {
    primary: '#1E1B16',
    secondary: '#6F675C',
    tertiary: '#A89F92',
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
   top-right in a white pill (`bg-ink-900` circle with a hairline border).
   Inside `SafeAreaView` from `react-native-safe-area-context`.
2. **Hero card**: one full-width `bg-ink-900 rounded-3xl p-5 border
   border-black/5` card with the day's headline metric + progress bar or arc.
   This anchors the screen.
3. **Stat duo/trio**: `flex-row gap-3` of smaller white cards, each with a
   metric color dot/icon, big number, tiny label.
4. **Horizontal scroller**: `FlatList horizontal` of cards (`w-64`), peeking
   next card, `showsHorizontalScrollIndicator={false}`.
5. **Progress**: bars with track `bg-black/10` + fill in the metric color,
   `h-2 rounded-full`. Rings/arcs in brand orange with `bg-black/10` remainder.
6. **Primary CTA**: full-width `bg-charcoal rounded-2xl py-4` with
   `text-white font-semibold text-center`. Secondary action: outline
   `border border-brand/40` with `text-brand`.
7. **List rows**: `flex-row items-center gap-4 py-3` with leading icon in a
   `h-11 w-11 rounded-2xl bg-brand-soft items-center justify-center` tile
   (icon in `brand`), title + subtitle stack, trailing value or chevron.
   Divide with `border-b border-black/5`, not gaps.

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
- `expo-status-bar` set to `style="dark"` on cream screens.
- Loading states are skeletons shaped like the real layout (`bg-ink-800
  rounded-3xl` blocks with a subtle opacity pulse), never a centered spinner.

## Pre-ship checklist

Before finishing any screen, verify:

- [ ] Would this hold up as a Dribbble shot? (hierarchy obvious at a glance,
      one hero element, intentional whitespace)
- [ ] Zero hard-ban violations from the anti-AI list.
- [ ] Colors come only from the tokens above; primary CTAs are charcoal with
      white text; orange is accent/progress only.
- [ ] Every tappable has press feedback; sections have entrance animation.
- [ ] Empty + loading states designed, not defaulted.
- [ ] Strings in both locale files; `pnpm run typecheck && pnpm run lint` pass.
