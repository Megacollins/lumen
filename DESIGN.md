# Lumen — Design Spec

Measured from https://www.o.cash on 2026-10-25 (desktop 1440×900, mobile 375×812), then adapted for Lumen.

**Rule:** we copy the *system* (proportions, type scale, spacing, colour logic, motion timings, layout patterns). We do **not** copy o.cash's code, images, icons, logo, product photography concepts or wording. Lumen has its own visuals and copy.

**This file supersedes PLAN.md §7.** The measurements changed three earlier guesses:
- **Corners are square, not rounded.**
- **Motion is far more minimal.**
- **The page background is grey, not white.**

---

## 1. What o.cash actually does (measured)

### Overall feel
- Monochrome. Near-black ink `#141413` on white and on a light grey `#F5F5F5`. No accent colour anywhere on the page.
- One typeface, Poppins, at weights 400, 500 and 600 only. Headings are **regular (400) weight at large sizes**, which is the main source of the "calm, expensive" feel.
- **Square everything:** buttons, cards and icon frames all have 0px radius, with hairline borders and no shadows.
- **Italic emphasis inside headlines.** One word per heading is italicised, for example "How *[Brand]* Retail Works" or "Break *Payment* Barriers". This is their strongest typographic signature.
- Imagery is editorial still-life photography: branded luxury objects on a soft grey studio backdrop, in a hero carousel.

### Measured tokens

| Token | o.cash value |
|---|---|
| Ink | `#141413` |
| Body text | ink at 70% opacity (`rgba(20,20,19,.7)`) |
| Subtitles | ink at 60% |
| Page background | `#F5F5F5`, with white sections and cards |
| Tonal band | `linear-gradient(#F5F5F5 0%, #C2C2C2 50%, #F5F5F5 100%)`, about 1450px tall, behind the mid-page sections |
| Card on grey | `#FFFFFF`, 0.67px border `rgba(20,20,19,.1)`, padding 28px 32px, radius 0, no shadow |
| Card on white | `#F5F5F5`, same border, padding 40px 32px, radius 0 |
| Primary button | `#141413` fill, white 16px/500 text, padding 12px 20px, radius 0, 1px ink border. Hover: opacity 0.7 over 0.2s |
| Header | fixed, 76px tall, transparent with `backdrop-filter: blur(4px)`, z-index 1000. Logo on the left, button on the right |
| Hero background | full-bleed photo with `filter: blur(4px)` and `object-fit: cover` |
| Icons | line icons, 2px stroke, black, no fill, drawn in 200×200 (feature) or 56×56 (card) frames |
| Social rail | fixed on the right edge, vertically centred, 32px gap (X, Discord) |
| Scroll cue | 40px animated arrow at the bottom of the hero, opacity 0.6 |

### Type scale (desktop → mobile)

| Role | Size / line height | Weight | Letter-spacing |
|---|---|---|---|
| Section title (h2) | 60px → 32px, line height 1.2 | 400 | −0.5px |
| Split-section title | 44–48px → 26–28px | 400 | −0.5px |
| Step title (h3) | 28px → 20px | 400 | normal |
| Card title (h4) | 18px / 27px | 500 | normal |
| Body | 16px / 24px → 15px / 22px | 400 | normal |
| Button | 16px / 24px | 500 | normal |

### Layout rhythm
- **Section padding:** 120–200px top and bottom on desktop, 140px on mobile; 32px side padding (16px on mobile). `--page-padding: 32px`.
- **Content width:** about 1200–1370px; centred text blocks about 700–1030px.
- **Breakpoints:** 1024, 960, 900, 860, 768, 720, 680px.
- **Section order:**
  1. Full-screen hero carousel (image only, no headline)
  2. Centred statement (h2 + paragraph + italic status line + button)
  3. Centred philosophy paragraph with a soft grey radial glow behind it
  4. "How it works": three equal square-cornered cards, each with a large line icon, title and caption
  5. Split section: title and paragraph on the left, three icon-bullet statements on the right
  6. Split section: big title on the left, 2×2 white card grid on the right
  7. Centred title + subtitle, then a 2×2 card grid
  8. Compliance: large monochrome 3D object on the left, title and bulleted list on the right (bold-italic lead-ins)
  9. Closing call to action: centred title, subtitle, button
- **Mobile:** everything stacks to one column. Cards go full width and keep their square corners and hairline borders. The fixed header stays.

### Motion (measured)
- **The hero is a "cover".** It's a full-viewport layer. The first wheel or swipe slides it up out of view, revealing the page, which then scrolls inside its own container with `scroll-behavior: smooth`. Scrolling back to the top brings the cover back.
- **The hero carousel** auto-advances every 2–3 s. Each slide moves sideways over **800ms with `cubic-bezier(0.25, 0.1, 0.25, 1)`**, and the carousel loops infinitely. On top of a static blurred backdrop, the slides read as a slow product showcase.
- **The header** blurs whatever scrolls beneath it (`blur(4px)`). That's the only scroll-linked effect.
- **Hovers:** buttons drop to opacity 0.7 over 0.2s; links fade colour over 0.3s.
- **There are no scroll-reveal animations, no keyframes and no parallax.** The calm comes from restraint, not choreography.

---

## 2. Lumen design system (adapted)

Same discipline, with Lumen's own identity: **light**. o.cash is pure greyscale; Lumen keeps the greyscale and adds one warm signal, a soft gold glow used only where privacy is shown.

### Colour

```css
:root {
  --ink:        #141413;                 /* same near-black: text, buttons */
  --ink-70:     rgba(20,20,19,.70);      /* body */
  --ink-60:     rgba(20,20,19,.60);      /* subtitles */
  --ink-40:     rgba(20,20,19,.40);      /* captions, disabled */
  --hairline:   rgba(20,20,19,.10);      /* every border */
  --paper:      #FFFFFF;                 /* cards on grey, white sections */
  --mist:       #F5F5F4;                 /* page background (a hair warmer than o.cash) */
  --band-mid:   #CFCDC8;                 /* tonal-band centre (warm grey, not o.cash's #C2C2C2) */
  --glow:       #E9D9A8;                 /* Lumen's light: privacy veil, hero glow, focus ring */
  --up:         #2F7D5B;
  --down:       #B5523B;
}
```

- **Tonal band:** `linear-gradient(var(--mist) 0%, var(--band-mid) 50%, var(--mist) 100%)` behind sections 4–6, as o.cash does.
- **Gold is a signal, not decoration.** Use it on the privacy veil, a 1px focus ring, a radial glow behind the hero object and the "private" status dot. Never on buttons or text.

### Typography
- **Font:** Poppins is o.cash's choice; using it too would make Lumen read as a clone. Use **Inter Tight** (or Geist), which has the same geometric calm and better numerals.
- **Headings:** weight 400, letter-spacing −0.02em. Body 400, labels and buttons 500. No bold above 600.
- **Italic signature, adapted:** italicise the *private* word in each headline, e.g. "Money that stays *yours*", "Markets, *quietly*". It reuses their device with our own meaning: the italic always marks the private idea.
- **Scale:** the same ladder as o.cash. h2 60/72 → 32/38; split h2 46 → 28; h3 28 → 20; card title 18/27 at 500; body 16/24; caption 14/20.
- **Numbers:** tabular figures (`font-feature-settings: "tnum"`) everywhere a value can change.

### Shape and depth
- **Radius 0** on cards, buttons, inputs, sheets and icon frames. The only exceptions are status dots and avatars, which are circles.
- **No shadows.** Depth comes from a 1px `--hairline` border plus tone (white on mist, mist on white).
- **Line icons:** 1.75px stroke (a touch lighter than o.cash's 2px), ink, no fill. Drawn by us (or from Lucide, adapted), never copied from o.cash.

### Spacing
- `--page-padding: 32px` (16px on mobile). Section padding 160px desktop / 120px mobile. Content max 1280px; centred text max 760px.
- **Grids:** three equal columns for "how it works", 2×2 card grids at a 32px gap, and a 5/7 column split for split sections.

### Buttons

| Kind | Style |
|---|---|
| Primary | Ink fill, white 16/500 text, 12px 20px padding, radius 0. Hover: opacity 0.7 over 200ms |
| Secondary | Transparent, 1px ink border, ink text, same hover |
| Text link | Ink with a 1px underline that fades in on hover over 300ms |

---

## 3. Landing page, section by section (Lumen)

Same skeleton as o.cash, with Lumen's content and visuals.

| # | Section | Layout (from o.cash) | Lumen content |
|---|---|---|---|
| 0 | Header | Fixed 76px, transparent + blur(4px). Wordmark left, primary button right | "Lumen" wordmark (our own) · **Open Lumen** |
| 1 | Hero cover | Full-viewport, image-only carousel over a blurred studio backdrop; scroll cue at the bottom; social rail on the right | **Lumen still-life series**, our own concept (see §5): 4–5 slides of objects that hold value quietly. No headline |
| 2 | Statement | Centred h2 + 70% body + italic status line + button | h2 "Private money. Private *markets*." Body: hold, send and invest in dollars, stocks and gold, visible only to you. Italic line "Live on NEAR mainnet" · **Open Lumen** |
| 3 | Philosophy | Centred paragraph, soft radial glow behind | "On public chains, every payment is a public record. Lumen gives back the privacy your bank never took away." Glow in `--glow` at 25% opacity (our gold, not their grey) |
| 4 | How it works | Three equal cards, 200px line icon, title, caption | **Add** (your private balance) · **Send** (to a username) · **Invest** (stocks and gold). Our own icons |
| 5 | Split: why | Left title + paragraph; right three icon bullets | "Wall Street, *discreetly*." Bullets: Tokenized by Ondo · Routed by NEAR Intents · Settled confidentially |
| 6 | Split: markets | Left big title; right 2×2 cards | "What you can *own*". Cards: NVDA, TSLA, QQQ, Gold, each with a quiet live price and daily change |
| 7 | Who it's for | Centred title + subtitle, 2×2 cards | Freelancers paid in stablecoins · Savers in high-inflation markets · Founders and treasuries · Investors who don't want to be copy-traded |
| 8 | Trust | Large monochrome object left; title + bullet list right (bold-italic lead-ins) | "Private, not *hidden*." ***Non-custodial*** — your keys, your money · ***Confidential Intents*** — a private NEAR shard secured by trusted hardware · ***Your statement, on demand*** — export a signed record · ***Geofenced*** — tokenized stocks are not offered to US persons |
| 9 | Closing call to action | Centred title, subtitle, button | "Your finances, finally *yours*." · **Open Lumen** |
| 10 | Footer | (o.cash has none beyond the rail) | Add a minimal one: Docs · GitHub · X · Terms · Risk disclosure · "Built on NEAR" |

---

## 4. Motion spec (Lumen)

Keep o.cash's restraint, with two signatures of our own.

| Element | Spec |
|---|---|
| Hero cover | Full-viewport layer; the first wheel, swipe or ↓ key slides it up `translateY(-100dvh)` over 900ms `cubic-bezier(0.65, 0, 0.35, 1)`. Scrolling to the top brings it back. Skip the scroll-jacking on touch devices if it fights native scroll; let it scroll away normally instead |
| Hero carousel | Auto-advance every 3.5s; **crossfade + 1.04→1 scale** over 800ms `cubic-bezier(0.25, 0.1, 0.25, 1)`. This differs from o.cash's sideways slide. Pause on hover and when the tab is hidden |
| Header | `backdrop-filter: blur(4px)` from the start; after 8px of scroll, add a hairline bottom border with a 200ms fade |
| Section entrances | **Our addition:** text blocks fade from 0 to 1 and rise 8px, 500ms `cubic-bezier(0.2, 0.8, 0.2, 1)`, once, as they enter. Cards in a grid stagger by 60ms. Nothing else moves on scroll |
| Buttons and links | Opacity 0.7 over 200ms; underline fade over 300ms (as o.cash) |
| Prices (section 6) | Digits roll on change over 200ms; a small up/down arrow tints `--up`/`--down`. No coloured blocks |
| Privacy veil (app + hero mock) | **Our signature:** balances sit at `filter: blur(8px)` and fade to sharp over 400ms on tap or hold, with a 1px `--glow` ring pulse |
| Reduced motion | `prefers-reduced-motion`: no cover slide (normal scroll), carousel becomes a static first slide, entrances become instant |

---

## 5. Lumen's hero concept (original)

o.cash's device is luxury objects branded with its logo (a banknote, a perfume called "Eau de Transfer", a logo ring). **We will not reuse those objects or that joke.**

Lumen's series is **"objects that hold value quietly, lit from within"**, photographed or rendered on the same soft studio grey. Each has a single warm light source (*lumen* = light):
1. A small gold bar with "Lumen" engraved, half in shadow
2. A folded stock certificate under frosted glass
3. A closed leather wallet with a thin line of light leaking from the seam
4. A brass key on a stone plinth
5. The Lumen mark as a frosted-glass object glowing softly

**Production:** generate with an image model in one consistent style (prompt template to write on Nov 1), 2400×1500, webp, about 200KB each. A static blurred backdrop sits behind the carousel, as o.cash does.

---

## 6. App screens: the same language carried into the product

- **Square corners** on sheets, inputs, number pads and cards. The app should feel like the landing page continued.
- **Mist background, white cards, hairline borders, no shadows.**
- **Big balance number** in 56px/400 tabular digits, behind the privacy veil.
- **Bottom sheets** slide up 320ms `cubic-bezier(0.2, 0.8, 0.2, 1)` with no bounce; the backdrop fades to `rgba(20,20,19,.4)`.
- **Status lines** (*Quoting → Filled → Private*) use a thin ink progress line, with a gold dot at "Private".

---

## 7. Off-limits checklist (before publishing anything)

- [ ] No o.cash images, hero photos, icons, logo shapes or ring mark
- [ ] No o.cash sentences or near-paraphrases ("settle with discretion", "Open Cash System", "Auditable Privacy", "Break Payment Barriers")
- [ ] No Poppins (avoid looking like a clone at a glance)
- [ ] Hero objects are our own concept (§5)
- [ ] Code is written from scratch against this spec
