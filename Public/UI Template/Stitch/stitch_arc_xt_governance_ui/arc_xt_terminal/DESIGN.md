# Design System Specification

## 1. Overview & Creative North Star
### The Creative North Star: "The Digital Architect"
This design system rejects the "web-page-in-a-sidebar" approach common in many extensions. Instead, it adopts the persona of a high-precision instrumentation panel. It is **The Digital Architect**: a system that favors structural integrity, extreme information density, and editorial authority.

By leveraging a "Terminal-Dashboard" aesthetic, we move beyond generic UI. We utilize intentional asymmetry—where metadata is tucked into rigid, monospace corners—and high-contrast tonal shifts to guide the eye. This system doesn't just display data; it validates it, signaling trust through a layout that feels as engineered as the code it analyzes.

---

## 2. Colors & Surface Logic
The palette is built upon a foundation of deep carbon tones and precise status-driven accents, utilizing VS Code’s native token architecture to ensure perfect theme integration.

### The "No-Line" Rule
Standard 1px borders are strictly prohibited for defining sections. Boundaries must be established through **Tonal Stepping**. A section’s edge is defined by the transition from `--vscode-sideBar-background` to `surface_container_low`. This creates a sophisticated, "etched" look rather than a boxed-in feel.

### Surface Hierarchy & Nesting
We utilize a "Nested Monolith" approach. Instead of floating cards, we use recessed and elevated planes:
- **Base Layer:** `surface` (`#0e0e0e`) — The root canvas.
- **Section Containers:** `surface_container_low` — For primary content groupings.
- **Active/Focused States:** `surface_container_high` — To pull the user's attention to a specific task row.
- **Inline Code/ID Wells:** `surface_container_lowest` — Deeply recessed areas for technical metadata.

### Signature Textures
Main CTAs should utilize a subtle vertical gradient from `primary` to `primary_container`. This provides a "machined" feel that flat color cannot replicate, signaling a premium tool.

---

## 3. Typography
The typographic system is a dialogue between human-readable labels and machine-executable data.

| Level | Font Family | Token | Role |
| :--- | :--- | :--- | :--- |
| **Display** | `Space Grotesk` | `display-sm` | High-level status summaries (e.g., "98% Coverage") |
| **Headline** | `Space Grotesk` | `headline-sm` | Section headers; bold and authoritative. |
| **Title** | `Inter` | `title-sm` | Task names and primary labels. |
| **Body** | `Inter` | `body-sm` | Descriptions and supporting text. |
| **Label** | `Inter` | `label-sm` | Metadata keys (e.g., "ID:", "PATH:"). |
| **Monospace** | `--vscode-editor-font-family` | N/A | File paths, Commit SHAs, and IDs. |

**Editorial Note:** Use `label-sm` in all-caps with 0.05em letter spacing for a "technical readout" feel when labeling monospace data.

---

## 4. Elevation & Depth
This system achieves depth through **Tonal Layering** rather than shadows. We treat the UI as a series of physical material sheets stacked within the VS Code sidebar.

### The Layering Principle
To create "lift" without drop shadows:
1. Place a `surface_container_low` element on the `surface` background.
2. Apply a **Ghost Border** for high-density environments: use the `outline_variant` token at **15% opacity**. This provides a surgical edge that keeps the UI clean but distinct.

### Glassmorphism & Depth
For floating panels (like command palettes or tooltips), use a semi-transparent `surface_container_highest` with a `backdrop-filter: blur(10px)`. This allows the underlying editor code to bleed through, maintaining the context of the workspace.

---

## 5. Components

### Status Badges (Pills)
High-density status indicators with a terminal aesthetic.
- **PASS:** Background: `tertiary_container`, Text: `on_tertiary_container`.
- **WARN:** Background: `#ffcc00` (Amber), Text: `#000000`.
- **FAIL:** Background: `error_container`, Text: `on_error_container`.
- **IN_PROGRESS:** Background: `primary_container`, Text: `on_primary_container`.
- **Shape:** `full` rounding; 4px padding-x.

### Task Rows
The core unit of the dashboard.
- **Layout:** Asymmetric. Title on the left, Monospace ID right-aligned in `on_surface_variant`.
- **Separation:** No dividers. Use 8px of vertical whitespace (`2x` spacing units).
- **Hover:** Transition background to `surface_bright` with a 2px left-accent border of `primary`.

### Buttons
- **Primary:** Background: `primary`, Text: `on_primary`, Radius: `sm` (0.125rem).
- **Secondary:** Background: `transparent`, Border: **Ghost Border** (15% `outline`), Text: `on_surface`.
- **Hover State:** All buttons should shift 1 step up in the surface scale (e.g., `primary` to `primary_fixed`).

### Monospace Code Blocks
- **Container:** `surface_container_lowest`.
- **Typography:** `--vscode-editor-font-family`, size `0.75rem`.
- **Padding:** `8px` (2 units).
- **Context:** Used for showing diffs or raw terminal output.

---

## 6. Do's and Don'ts

### Do
- **Do** use the 4px grid religiously. All padding and margins should be multiples of 4 (4, 8, 12, 16, 24).
- **Do** lean into high density. Users of this tool are pros; they value seeing 20 rows of data over "breathing room."
- **Do** use `on_surface_variant` for less important metadata to create visual hierarchy through color, not just size.

### Don't
- **Don't** use standard `border-bottom` to separate list items. Use background-color stepping or empty space.
- **Don't** use the default VS Code blue for everything. Reserve `primary` (`#9fcaff`) for the most critical action.
- **Don't** use standard "drop shadows." If an element needs to float, use a tinted ambient shadow (4% opacity of the `primary` color) to simulate a glow rather than a shadow.

### Accessibility Note
While maintaining high density, ensure that all `on_surface` text vs `surface` background maintains a contrast ratio of at least 4.5:1. Use the "Ghost Border" fallback specifically for users with high-contrast themes enabled.