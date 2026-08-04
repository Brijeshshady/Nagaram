# DESIGN.md — Nagaram UI/UX Design System Contract

This document acts as the visual source of truth and design contract for the Nagaram Smart City platform.

---

## 1. Visual Theme & Atmosphere
* **Mood & Style:** Mission Critical / Clean Utilitarian.
* **Atmosphere:** Stable, authoritative, light-mode dominant with high accessibility and clear visual hierarchies. No decorative clutter.

---

## 2. Color Palette & Roles
* **Canvas Background:** `#f8f9ff` (Soft Blue-Gray Tint)
* **Surface Background:** `#ffffff` (Pure White)
* **Primary (Text / Authority):** `#0f172a` (Slate-900 / Trustworthy Navy)
* **Secondary Accent (Emergency):** `#dc2626` (Red-600 / Urgent Alerts)
* **Tertiary Accent (Warning):** `#d97706` (Amber-600 / Pending States)
* **Success/Positive Action:** `#166534` (Green-800)
* **Borders / Lines:** `#c6c6cd` (Muted Grey outline)

---

## 3. Typography Rules
* **Primary Family:** `Inter`, sans-serif (Exceptional readability, tall x-height)
* **Technical Family:** `JetBrains Mono`, monospace (Used for serial tickets, coordinates, numerical stats, badges)

---

## 4. Layout & Spacing
* **Desktop Grid:** 12-column layout, fluid main panels.
* **Gutter Sizing:** 16px to 24px baseline rhythms.
* **Sidebar Panel:** Fixed-width 260px white glass panel.

---

## 5. Depth & Elevation
* **Tonal Contrast:** Separation of cards via 1px border lines rather than deep drop shadows.
* **Active Overlay:** Active modals use a diffused ambient shadow (`0px 4px 12px rgba(15, 23, 42, 0.08)`) with absolute focal coverage.

---

## 6. Components
* **Buttons:** 4px (Soft) rounded corners, minimum 44px hit bounds.
* **Alerts:** Full-width pinned banners with solid high-contrast status colors.
* **Input Fields:** 1px gray outline changing to 2px navy border on active focus.
