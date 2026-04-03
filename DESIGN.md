# Todo App Design System

A dark-theme design system for a personal productivity app. Built with Tailwind CSS 4 and Framer Motion. Optimized for both AI agent consumption and human reference.

## Visual Theme & Atmosphere

Minimal, focused dark UI inspired by Linear. Soft purple accents against deep navy/charcoal backgrounds. No visual clutter. Subtle borders and layered surfaces create depth without heavy shadows. Particle background adds ambient energy.

## Color Palette & Roles

### Backgrounds (darkest to lightest)

| Token | Hex | Role |
|---|---|---|
| `bg-page` | `#0D0E12` | Full-page background |
| `bg-surface` | `#17181C` | Header, input containers, elevated regions |
| `bg-card` | `#1C1D22` | Cards, modals, dropdowns |
| `bg-elevated` | `#23242A` | Inputs on login page, special elevated surfaces |

### Accent

| Token | Hex | Role |
|---|---|---|
| `accent-primary` | `#5E6AD2` | Buttons, checkboxes, progress bars, active states |
| `accent-hover` | `#7C85E0` | Hover states, secondary accent text, icon highlights |

Use opacity modifiers for accent variations: `accent-primary/10` for light backgrounds, `accent-primary/20` for badges, `accent-primary/30` for hover states.

### Text

| Token | Value | Role |
|---|---|---|
| white | `#FFFFFF` | Headings, primary content, button text |
| `text-secondary` | `#CBD5E1` | Body text, item titles, labels |
| `text-tertiary` | `#94A3B8` | Icons, secondary buttons, inactive navigation |
| `text-muted` | `#64748B` | Placeholders, subtitles, disabled text, borders on checkboxes |
| `text-faint` | `#475569` | Outside-month calendar dates |

### Borders

| Token | Value | Role |
|---|---|---|
| `border-subtle` | `rgba(255,255,255,0.04)` | Input borders, section dividers, list separators |
| `border-default` | `rgba(255,255,255,0.06)` | Card borders, modal borders, header bottom border |
| `border-strong` | `rgba(255,255,255,0.1)` | Hover state borders |

### Semantic

| Token | Value | Role |
|---|---|---|
| `danger` | `#F87171` | Delete action text |
| `danger-bg` | `rgba(239,68,68,0.1)` | Delete hover background, error background |
| `danger-border` | `rgba(239,68,68,0.2)` | Error borders |
| `success` | `#34D399` | Success gradient start (emerald) |
| `success-to` | `#2DD4BF` | Success gradient end (teal) |

## Typography Rules

- **Font family:** system-ui, -apple-system, sans-serif
- **Headings:** text-white, font-semibold or font-bold
  - Page titles: text-2xl sm:text-3xl font-bold
  - Section titles: text-lg font-semibold
  - Modal titles: text-xl font-semibold
- **Body text:** text-text-secondary, text-sm or text-base
- **Labels:** text-text-secondary text-sm font-medium
- **Placeholders:** placeholder-text-muted
- **Muted/subtitles:** text-text-muted text-sm

## Spacing & Layout

- **Base unit:** 4px (Tailwind default)
- **Page container:** max-w-3xl mx-auto px-4
- **Section spacing:** space-y-6
- **Card padding:** p-4 to p-6
- **Modal padding:** p-6 (header), p-4 (body)
- **Input height:** py-3 to py-3.5 (44-48px total)
- **Button padding:** px-5 py-3 (primary), px-3 py-2 (secondary)
- **Icon button padding:** p-2.5
- **Gap between items:** gap-2 to gap-3

## Border Radius Scale

| Class | Pixels | Usage |
|---|---|---|
| `rounded` | 4px | Small badges |
| `rounded-lg` | 8px | Buttons, list items, inputs (small) |
| `rounded-xl` | 12px | Inputs, icon buttons, todo items |
| `rounded-2xl` | 16px | Section cards, popovers, dropdowns |
| `rounded-3xl` | 24px | Modals, main containers |

## Shadows & Elevation

- **shadow-lg shadow-accent-primary/20** -- Primary buttons (colored glow)
- **shadow-lg shadow-accent-primary/25** -- Logo (stronger glow)
- **shadow-2xl** -- Modals, dropdowns
- **shadow-2xl shadow-black/30** -- Mobile dropdown menu
- **shadow-xl** -- Calendar popover

## Component Stylings

### Primary Button

```
bg-accent-primary hover:bg-accent-hover text-white font-semibold
rounded-xl px-5 py-3 shadow-lg shadow-accent-primary/20
transition-all duration-200
disabled:opacity-50 disabled:cursor-not-allowed
```

Framer Motion: whileHover scale 1.02, whileTap scale 0.98

### Secondary/Ghost Button

```
bg-accent-primary/20 text-accent-hover text-sm font-medium
rounded-lg px-3 py-2 hover:bg-accent-primary/30
```

### Icon Button (header)

```
p-2.5 rounded-xl bg-bg-card border border-border-default
text-text-tertiary hover:text-accent-hover hover:border-accent-primary/30
transition-all duration-200
```

Framer Motion: whileHover scale 1.05, whileTap scale 0.95

### Input

```
rounded-xl bg-bg-surface border border-border-subtle
text-slate-100 placeholder-text-muted
focus:outline-none focus:ring-2 focus:ring-accent-primary/40 focus:border-accent-primary/50
hover:border-border-strong transition-all duration-200
```

Height: py-3 to py-3.5. Left icon with pl-12.

### Card

```
rounded-2xl bg-bg-card/50 border border-border-default
hover:border-accent-primary/30 hover:bg-bg-card/80
transition-all duration-200
```

Framer Motion: whileHover scale 1.01, whileTap scale 0.99

### Modal

```
Backdrop: bg-black/60 backdrop-blur-sm
Container: bg-bg-card rounded-3xl border border-border-default shadow-2xl
```

Framer Motion entry: opacity 0->1, scale 0.95->1, y 20->0, duration 0.2s

### Checkbox

```
w-7 h-7 rounded-lg border-2 flex items-center justify-center
Unchecked: border-text-muted hover:border-accent-hover hover:bg-accent-primary/10
Checked: bg-accent-primary border-accent-primary
```

Framer Motion: whileHover scale 1.15 (desktop only)

### Delete Action

```
text-text-muted hover:text-danger hover:bg-danger-bg
rounded-lg p-2 transition-all duration-200
```

### Error Alert

```
bg-danger-bg border border-danger-border text-danger
rounded-lg p-3 text-sm
```

## Motion & Animation

All interactive elements use Framer Motion. Animations are reduced on mobile.

### Scale Patterns

| Element | Hover | Tap | Mobile hover | Mobile tap |
|---|---|---|---|---|
| Primary button | 1.02 | 0.98 | disabled | 0.99 |
| Icon button | 1.05 | 0.95 | disabled | 0.98 |
| Card | 1.01 | 0.99 | disabled | 0.995 |
| Checkbox | 1.15 | 0.9 | disabled | 0.96 |
| Close button | 1.1 | 0.9 | same | same |

### Transition Patterns

- **Standard:** duration-200 (CSS transitions for colors/borders)
- **Modal enter/exit:** 0.2s, scale + opacity + y-offset
- **Dropdown enter/exit:** 0.16s easeOut, opacity + y-offset
- **List item enter:** spring (stiffness 100, damping 25) desktop; 0.16s easeOut mobile
- **List item exit:** 0.2s desktop, 0.12s mobile, slide left (x: -100 / -40)
- **Checkbox check:** spring (stiffness 500, damping 15) desktop; 0.12s easeOut mobile
- **Progress bar:** 0.5s easeOut desktop, 0.25s mobile

### Reorder

- Drag handle: cursor-grab, active:cursor-grabbing, touch-none
- Debounce: 600ms after reorder before API call

## Responsive Behavior

- **Breakpoint:** 768px (single breakpoint, mobile-first)
- **Detection:** `useIsMobile()` hook using `matchMedia`
- **Mobile changes:**
  - Header: hamburger menu replaces inline buttons
  - Hover animations: disabled (only tap animations)
  - Particles: reduced from 200 to 30
  - Spring animations: replaced with simple easeOut (shorter duration)
  - Touch targets: minimum p-2.5 (40px)

## Do's and Don'ts

### Do

- Use semantic tokens for ALL colors (bg-bg-card, text-text-muted, etc.)
- Use opacity modifiers on accent token (accent-primary/10, accent-primary/20)
- Disable hover animations on mobile (check useIsMobile)
- Use Framer Motion for all interactive scale animations
- Use rounded-3xl for modals, rounded-2xl for cards, rounded-xl for inputs
- Use border-border-default for container borders, border-border-subtle for internal dividers
- Add cursor-pointer to all interactive elements

### Don't

- Don't use raw hex colors (#5E6AD2) in class names -- use tokens
- Don't add new colors without adding them to @theme in index.css
- Don't use hover animations on mobile -- always check isMobile
- Don't use shadows heavier than shadow-2xl
- Don't use font weights below 500 (medium)
- Don't create light mode styles -- this is dark-only
- Don't use bg-black for backgrounds -- use bg-bg-page
- Don't use border-gray or border-slate -- use border-border-* tokens
- Don't use text-gray-* -- use text-text-* tokens

## Agent Prompt Guide

When generating UI for this app:

1. Import `useIsMobile` from `@/hooks/useIsMobile` for responsive behavior
2. Import `motion` from `framer-motion` for animations
3. Use `ModalContainer` and `ModalHeader` from `@/components/shared/` for modals
4. Use `ItemAddInput` from `@/components/shared/` for add-item inputs
5. All background colors come from bg-bg-* tokens
6. All text colors come from text-text-* tokens or text-white
7. All borders use border-border-* tokens
8. Accent color interactions: accent-primary for active/filled, accent-hover for hover text/icons
9. Dangerous actions: danger for text, danger-bg for background
10. Transition duration: 200ms for most interactions
