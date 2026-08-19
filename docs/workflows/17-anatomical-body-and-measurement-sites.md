# Workflow 17 — Anatomical Body Figure and Measurement Sites

## Objective

The body map stops looking like stacked rectangles and becomes a shaded, anatomically
proportioned human figure, promoted to a shared component — and that figure becomes the
way body measurements are taken: tap a site on the body, log the tape reading there.

## User value

The figure reads as a body at a glance, so picking "right biceps" or "hips" is a tap on
the anatomy instead of hunting through a wall of identical chips. Measuring becomes the
visual, obvious path it should always have been.

## Scope

- **`components/HumanBody.tsx` (new, shared)** — replaces
  `features/exercises/components/BodyMap.tsx` (rectangles and ellipses) with a figure
  built from SVG `Path` outlines on a 200×420 viewBox using the 8-head canon: skull with
  jaw taper, trapezius slope into deltoid caps, pectorals and rib cage narrowing to the
  waist, oblique-to-hip flare, thigh mass tapering to the knee, calf bellies over the
  tibia line, and hands/feet that read as hands and feet.
  - *Dimensional shading (the "3D" read)*: each muscle group is filled with its own
    `LinearGradient` (light on the medial/upper edge → dark toward the contour), a
    `RadialGradient` core highlight on the large groups, hairline contour separations
    between adjacent groups, and a soft occlusion wash at the joints (shoulder, elbow,
    knee) plus a ground shadow ellipse under the feet. Selected parts swap to a brand
    gradient and gain a halo; nothing rotates and no camera is involved.
  - *Generic hotspot API* so both features drive it without either owning the anatomy:
    `parts` are anatomical (`biceps`, `thigh`, …) and each carries a
    `laterality` (`left` | `right` | `center`); the consumer supplies
    `keyFor(part, laterality) → string | null` (null = not selectable, rendered dimmed),
    `selectedKey`, `onSelect(key)`, and an optional `badgeFor(key) → string | null` for
    a value pill anchored to the part.
- **Exercises keeps its behavior** — `ExerciseBrowserScreen` maps both lateralities of a
  part onto the same `BodyRegion` (a left/right biceps tap both filter `biceps`), so the
  catalog filter is unchanged; `regions.ts` stays the source of truth for the 12 regions.
- **Measurements gains the figure** — `features/measurements/measurement-sites.ts` maps
  (part, laterality) onto the seeded measurement type keys: `neck`, `shoulders`, `chest`,
  `waist`, `hips`, and the paired `left_/right_biceps`, `_triceps`, `_forearm`, `_thigh`,
  `_calf`. Front/back views cover every anatomical type.
  - *`MeasurementsScreen`*: the figure becomes the hero, each measured site showing its
    latest value as a badge; tapping a site pushes the log screen with that type
    preselected. The "Latest" list, photos, and the log CTA stay.
  - *`LogMeasurementScreen`*: accepts a `typeKey` route param, and shows the figure as
    the site picker with the reading field below it. `weight` and `body_fat` are not
    anatomical sites, so they keep a small chip row above the figure.

### Decisions

- **Shaded vector, not a real 3D mesh.** A rotatable WebGL body (`expo-gl` + `three` +
  a rigged GLTF human) would add a native module, a multi-megabyte licensed asset, and
  lighting that fights the app's warm editorial palette — for a figure whose whole job
  is "tap the right muscle". Gradients, occlusion, and contour separations give the
  dimensional read at zero new dependencies, stay themeable from the design tokens, and
  keep the geometry unit-testable. Revisit only if a feature actually needs rotation.
- **The component owns anatomy; features own meaning.** Anatomical part ids live in
  `HumanBody`; the mapping to exercise regions and to measurement type keys lives in
  each feature. That is what lets one figure serve both without a union type that knows
  about tape measures and exercise catalogs at once.
- **Laterality is part of the model, not two copies of the figure.** Measurements need
  left vs right; exercises do not. Encoding it in the hotspot and letting `keyFor`
  collapse it keeps a single anatomy definition.
- **Sites with no reading yet show no badge** (not "0 cm") — an unmeasured site is
  unknown, not zero.

## Non-goals

- No rotation, no camera, no WebGL, no 3D model files. No new measurement types and no
  schema change (the seeded types already cover every site). No AI. No body-fat
  estimation from photos or from circumferences.

## Data model involved

Read-only over `measurement_types` / `measurements` through the existing endpoints. No
migrations.

## Backend tasks

- [x] None — the seeded system measurement types already cover every anatomical site,
      and `GET /api/measurements/types` + `/latest` already serve what the figure needs.

## Frontend tasks

- [x] `components/HumanBody.tsx`: anatomical paths, gradient/occlusion shading, front &
      back views, hotspot API with laterality, badges, press feedback per part.
- [x] `components/human-body-geometry.ts`: part table + pure helpers (visible parts per
      side, badge anchor points, mirroring) with Jest tests.
- [x] `features/exercises`: point `ExerciseBrowserScreen` at the shared component,
      collapsing laterality onto `BodyRegion`; delete the old `BodyMap.tsx`.
- [x] `features/measurements/measurement-sites.ts` + Jest test proving every anatomical
      seeded type is reachable from exactly one (part, laterality) pair.
- [x] `MeasurementsScreen`: figure hero with latest-value badges, tap → log screen.
- [x] `LogMeasurementScreen`: `typeKey` param, figure as site picker, weight/body-fat
      chips.
- [x] `navigation/types.ts`: `LogMeasurement: { typeKey?: string } | undefined`.
- [x] en/es strings for the new labels and hints.

## API contracts

Unchanged.

## Validation rules

Unchanged — the log screen still validates the reading with `parseDecimal` and the
backend's Zod bounds are untouched.

## Security considerations

Presentation-only; no new data leaves the device and no endpoint changes.

## Acceptance criteria

- The figure reads as a human body in both views: proportioned limbs, shaded volume, no
  visible rectangles.
- Every anatomical measurement type is reachable by tapping the figure, left and right
  distinguished; measured sites show their latest value.
- Tapping a site opens the log screen with that type already selected; saving still
  works from both entry points.
- The exercise browser filters exactly as before the refactor.
- All CI checks green in both apps.

## Tests

Frontend Jest: geometry helpers (front/back part visibility, mirrored coordinates, badge
anchors inside the part's box); `measurement-sites` (every seeded anatomical key mapped
exactly once, unmapped parts return null, left/right resolve to distinct keys);
`regions` coverage test still passes unchanged. Backend: untouched suite must stay green.

## Definition of done

- [x] Acceptance criteria pass locally and in CI; checklists updated; summary reported.
