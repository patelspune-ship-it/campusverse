# CampusVerse Design System Audit

The active design token source is `src/index.css`, consumed by `tailwind.config.ts` and shadcn components in `src/components/ui/`.

## Visual tokens

| Element | Light mode token | Dark mode token / implementation |
|---|---|---|
| Primary | HSL `280 65% 39%` (purple) | `280 75% 60%` |
| Secondary | `280 55% 96%` | `280 30% 18%` |
| Accent | `158 64% 52%` (green/teal) | same |
| Background/card | near-white 99% / white | purple-tinted 7% / 10% |
| Text | 10% gray-black | 98% white |
| Destructive | red `0 84% 60%` | `0 72% 51%` |
| Radius | `0.75rem` base; shadcn `lg/md/sm` derived tokens | same |
| Gradients | purple primary 135° and green accent 135° | brighter dark-mode variants |
| Shadows | soft `0 4px 20px -4px` purple alpha; strong `0 10px 40px -10px` | stronger purple alpha |

There is no configured custom font family; UI uses the browser/Tailwind default sans serif. Common text scales: `text-xs`, `text-sm`, `text-base`, `text-xl`, page headings `text-2xl`, hero `text-4xl md:text-5xl`, and data figures `text-3xl/4xl`; weights are mainly medium, semibold and bold.

## Components and patterns

- Reusable primitives are shadcn/Radix implementations under `src/components/ui/`: Button, Card, Input, Select, Dialog, Sheet, Table, Form, Toast, Badge, Tabs, Tooltip and many others.
- Shared domain components: `Header.tsx`, `EventCard.tsx`, `ClubCard.tsx`, `NavLink.tsx`; role portal layouts: club/admin/faculty layouts.
- Cards use white/card surfaces, border, `rounded-lg`/`rounded-xl`, soft-to-strong hover shadows and media thumbnails.
- Buttons use the shadcn primary variant, usually `rounded-md`, text-sm/medium; important actions add the soft shadow. Badges use rounded-full pills.
- Icons are Lucide React. Images: MIT ADT logo at `/top.png`, Cloudinary URLs for uploaded club/event media.
- Feedback is toast-based (Sonner) and loading uses skeleton/pulse patterns.
- Motion is modest: Tailwind transition colors/shadows, accordion animation, dialog/sheet animation, and pulse skeletons. No custom animation system is present.

## Responsive behavior

The public header hides its link navigation below `md`. Club/admin/faculty layouts use fixed desktop sidebars at `lg` and a mobile sticky header/drawer overlay below that breakpoint. Lists/cards adapt with Tailwind grid classes; see `Home.tsx`, `EventCard.tsx`, `ClubCard.tsx`, and layouts.

## Mobile preservation recommendation

Carry the purple/teal token pair, soft purple elevation, rounded 12 px surfaces, Lucide-equivalent icons, compact semibold labels, badge semantics, and branded gradient wordmark into a React Native token/theme module. Adapt interaction rather than copying desktop geometry: bottom tabs for primary student tasks, stacked full-width cards, native picker/sheet patterns, larger 44+ pt touch targets, safe-area headers, and a dedicated scanner camera screen. Fonts and exact accessibility contrast compliance are UNKNOWN — REQUIRES HUMAN CONFIRMATION and should be validated with the product owner.
