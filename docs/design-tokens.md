# DawrBa Design Tokens

## Purpose
This document defines the official spacing, typography, radius, shadow, icon, and breakpoint tokens used throughout the DawrBa application.

All UI components must use these tokens instead of hardcoded values whenever possible.

---

# Spacing Scale

| Token | Value |
|------|------|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-5` | 20px |
| `--space-6` | 24px |
| `--space-8` | 32px |
| `--space-10` | 40px |

---

# Border Radius Scale

| Token | Value |
|------|------|
| `--radius-sm` | 8px |
| `--radius-md` | 12px |
| `--radius-lg` | 16px |
| `--radius-xl` | 20px |
| `--radius-2xl` | 24px |
| `--radius-full` | 999px |

---

# Typography Scale

| Token | Value |
|------|------|
| `--text-xs` | 12px |
| `--text-sm` | 14px |
| `--text-md` | 16px |
| `--text-lg` | 18px |
| `--text-xl` | 20px |
| `--text-2xl` | 24px |
| `--text-3xl` | 30px |

---

# Font Weights

| Token | Value |
|------|------|
| `--font-medium` | 500 |
| `--font-semibold` | 600 |
| `--font-bold` | 700 |
| `--font-extrabold` | 800 |

---

# Icon Sizes

| Token | Value |
|------|------|
| `--icon-sm` | 16px |
| `--icon-md` | 20px |
| `--icon-lg` | 24px |
| `--icon-xl` | 28px |
| `--icon-2xl` | 32px |

---

# Breakpoints

| Device | Width |
|--------|------|
| Mobile | < 768px |
| Tablet | 768px – 1023px |
| Desktop | ≥ 1024px |
| Large Desktop | ≥ 1440px |

---

# Complete CSS Token Block

```css
:root {
  /* Colors */
  --db-primary: #2563EB;
  --db-success: #16A34A;
  --db-danger:  #DC2626;
  --db-warning: #EA580C;
  --db-pending: #CA8A04;

  --db-text: #111827;
  --db-text-secondary: #6B7280;
  --db-bg: #F3F4F6;
  --db-surface: #FFFFFF;
  --db-border: rgba(17,24,39,0.08);

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;

  /* Radius */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  --radius-2xl: 24px;
  --radius-full: 999px;

  /* Typography */
  --text-xs: 12px;
  --text-sm: 14px;
  --text-md: 16px;
  --text-lg: 18px;
  --text-xl: 20px;
  --text-2xl: 24px;
  --text-3xl: 30px;
}
```

---

# Final Principle

Every screen in DawrBa should use these tokens so that spacing, typography, colors, and component sizes remain consistent across the entire application.

This document, together with `app-color-system.md`, forms the official DawrBa design system.