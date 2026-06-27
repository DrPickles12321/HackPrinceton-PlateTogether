# Mobile UI & Pre-Launch Plan

Design plan for bringing Plate Together to phones. The goal is a calm,
parent-friendly mobile experience and a clean first launch — fix the real
blockers first, ship, then add native packaging.

This is a planning document, not a spec to implement verbatim. Check items off
as they land.

---

## Core principle: one screen = one job

On desktop we can show everything at once. On a ~380px phone we can't, and
trying to is what makes the current layout feel crowded. The answer is
**progressive disclosure** — show a calm summary, reveal detail on tap.

Three moves carry the whole redesign:

1. **Collapse meal cards by default.** A logged meal becomes a one-line summary
   (`Breakfast · Toast, Banana · ●Ok`). Tap to expand and edit. Only one card is
   expanded at a time. The Today screen becomes a tidy list of 4 rows instead of
   a wall of controls.
2. **Tap-to-add replaces drag-and-drop.** Drag is unusable on touch and fights
   with scrolling. Tapping "+ Add food" opens a bottom sheet (reusing the
   existing My List / Suggested tabs).
3. **Move the right rail out.** Clinician + parent notes become their own tab;
   supplements become a collapsible section under the meals.

---

## Tab structure — 4 bottom tabs

Standard iOS/Android bottom tab bar, thumb-reachable, no "More" menu.

| Tab | Holds | Notes |
|---|---|---|
| **Today** | The 4 meal cards + supplements for one day | Default landing screen; the daily habit. |
| **Week** | The 7×4 color status grid | At-a-glance review; tap a cell for detail. |
| **Insights** | Stats + AI encouragement + anomaly flags | Reflection, not daily use. |
| **Notes** | Clinician notes (from care team) + parent's own notes | Pulled out of Today's cramped right rail — the single biggest declutter. |

Supplements do not need a tab; they are a collapsible row at the bottom of Today
since they are a daily, per-day action.

Current parent routes today: `Daily / Weekly / Insights` (see `src/App.jsx`).
The new structure adds a **Notes** tab and renames Daily → Today, Weekly → Week.

---

## The Today screen (the crowding fix)

The current Daily view (`src/pages/DailyView.jsx`) is a 3-column desktop layout:
food library (left) · meal cards (center) · right rail with clinician notes +
"This Week" counts + supplements. That 3-column design is the entire crowding
problem and cannot survive on a phone.

Mobile Today screen, top to bottom:

- **Compact day header** — `Today` + `Wed, Jun 24` with `‹ ›` steppers (and
  swipe between days). The 7 day-pills move to the Week tab; they eat too much
  vertical space here.
- **4 meal cards, collapsed by default:**
  - Logged → one line: icon, name, time, food summary, status dot, chevron.
  - Empty → "Tap to add foods" + a one-tap **Skip** shortcut.
  - Tap a card → it expands in place for editing; others stay collapsed.
- **Expanded meal card:**
  - Time shown as a tappable chip → opens the native time picker.
  - Food chips with `×` to remove.
  - "+ Add food" → opens the add-food bottom sheet.
  - Status row: `Ok / Hard / No / Skip`, full-width, ≥44px tall, each toggles off.
- **Supplements** — collapsible row (`1 of 2`) at the bottom.

### Add-food bottom sheet (replaces drag-and-drop)

- Slides up from the bottom titled "Add to {meal}".
- Search field (autocomplete from `commonFoods` + the family's list).
- My List / Suggested tabs (already built in `FoodSidebar`).
- Tap a food → adds it, sheet **stays open** with a ✓ so several can be added.
- "Done · N added" button closes the sheet.
- Suggested foods keep the choose-category behavior, but with ≥44px targets.

---

## Tap interaction patterns

- **Collapse/expand** for meal cards — the primary decrowding mechanism.
- **Bottom sheets** for anything that was a popover or sidebar on desktop:
  add-food, the macro nutrition detail (currently the floating `DayPopover`),
  add-note. Bottom sheets are reachable, predictable, and don't overflow.
- **Toggle buttons** for status (already shipped on web): tapping the selected
  one clears it.
- **Native pickers** for time (`<input type="time">`) — never custom tiny fields
  on touch.

---

## Making it easy for parents

- Lands on **today**, current day pre-selected — most logging is "what we just ate."
- **Logging a meal is 3 taps:** expand → add food → tap a status.
- **Minimize typing:** native time picker, food via tap-search not free text.
- **Forgiving:** every status toggles off, Skip is one tap, foods removable.
- **Unmissable states:** logged (color dot) vs empty (dashed / "add") vs skipped
  (⊘ muted) are visually distinct, so a parent never wonders "did I log this?"

---

## Pre-launch problem & bug checklist

The real issues that will break or frustrate on a phone. Fix before launch.

### Blockers (must fix)

> Done 2026-06-27 (Today screen). A `useIsMobile()` (≤768px) hook gates an
> entirely separate single-column branch in `DailyView.jsx`; the desktop
> `@dnd-kit` 3-column layout is untouched and still renders ≥769px. Verified in
> browser at 375px and 1280px.

- [x] **Replace drag-and-drop with tap-to-add.** New `AddFoodSheet.jsx` (bottom
      sheet, My List / Suggested tabs) + `MobileMealCard`; desktop drag-end and
      mobile tap both go through a shared `addFoodToMeal()` in `DailyView.jsx`.
- [x] **Collapse the 3-column Daily layout to one column.** Mobile branch is a
      single scrolling column (meals → supplements → progress → notes → stats).
- [x] **Remove fixed widths that cause horizontal scroll.** Mobile branch drops
      the `width:272`/`214` sidebars and `maxWidth:1280`; uses full-width / flex.
- [x] **Fix iOS input zoom.** Global `@media (max-width:768px){ input,textarea,
      select{ font-size:16px } }` in `src/index.css`.

### High priority

- [x] **Native time picker.** `MobileMealCard` uses `<input type="time">`; the
      desktop 3-field editor stays on `MealCard`.
- [x] **Convert floating popovers to bottom sheets.** Mobile `WeeklyView` taps a
      day → `BottomSheet` macro summary instead of the fixed `DayPopover` (desktop
      keeps the popover).
- [ ] **Enlarge tap targets to ≥44px.** Status dots, the `⋮`/`×` on food chips,
      and the suggested-food category dots are all too small for touch.
- [x] **Respect safe areas.** Bottom tab bar needs `env(safe-area-inset-bottom)`
      padding or it sits under the iPhone home indicator.
- [ ] **Avoid trapped nested scroll panes.** Several `overflowY:auto` + `flex:1`
      panes trap scrolling on mobile; let the page scroll naturally.

### Polish

- [x] **Week grid fit.** Parent week grid has a compact mobile branch; clinician
      `WeeklyGrid` keeps its `overflow-x-auto` wrapper. Clinician dashboard chrome
      (header / controls / 2-col grid) is now responsive too.
- [x] **Keyboard overlap.** `BottomSheet` lifts above the on-screen keyboard via the
      VisualViewport API; `interactive-widget=resizes-content` added to the viewport meta.

---

## Path to a clean launch

1. **Make it responsive + tap-to-add** (the blocker list) behind mobile
   breakpoints, leaving the desktop drag experience unchanged. This alone makes
   the app usable in a phone browser — no native packaging required.
2. **Test on real devices** — Chrome on Android *and* Safari on iOS; they differ
   on inputs, safe areas, and scroll behavior.
3. **Add a PWA manifest + service worker** for add-to-home-screen.
4. **Wrap with Capacitor** only when App Store / Play Store presence is wanted —
   it packages the same responsive build into native shells; Firebase, the
   Cloudflare AI proxy, and all `lib/` logic carry over unchanged.

Treat steps 1–2 as "the launch." Everything after is additive.

### What carries over vs. what changes

| Reuses as-is | Needs mobile rework |
|---|---|
| Firebase Auth + Realtime DB layer | Drag-and-drop → tap-to-add |
| Cloudflare Worker (AI proxy) | 3-column layouts → single column |
| `lib/insights.js`, `anomalyDetection.js`, `aiInsights.js` | Top navbar → bottom tabs |
| `FirebaseDataContext` (hooks/queries) | Floating popovers → bottom sheets |
| `data/commonFoods.js`, nutrition logic | Inline time editor → native picker |

### Notes

- The **clinician** experience is fine as a responsive web/PWA (clinicians work
  at desks). Focus native effort on the **parent** app where on-the-go logging
  matters most.
- Keep Cormorant Garamond for large headings — it reads beautifully on mobile.
