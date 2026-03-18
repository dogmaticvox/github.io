# Garry's Tiki Bar — App Design Document

## Overview

A single-page, offline-first cocktail recipe app built as a PWA. It manages 111+ tiki recipes with inventory tracking, filtering, ratings, favorites, shopping lists, and full offline support. Pure vanilla JS — no frameworks, no build tools.

---

## Architecture

| File | Purpose |
|------|---------|
| `index.html` | Entire app shell — HTML, CSS, and all JS inline (~83KB) |
| `recipes.json` | Static recipe database (111 recipes, 136 ingredients) |
| `sw.js` | Service worker for caching & offline |
| `manifest.json` | PWA metadata (icons, shortcuts, display mode) |
| `icons/` | 192x192 and 512x512 PNG app icons |
| `images/` | Background image |

No npm, no bundler, no framework. Everything ships as static files hosted on GitHub Pages.

---

## Data Model

### Recipe Object

```json
{
  "id": "001",
  "name": "Arrack Punch",
  "category": "RUM THROUGH THE AGES",
  "ingredients": ["2 ounces fresh lemon juice", "..."],
  "ingredientIDs": [49, 50, 104],
  "origin": "...",
  "glassware": "...",
  "instructions": "...",
  "garnish": "..."
}
```

### Ingredient Map

136 ingredients mapped to numeric IDs: `{ "fresh lime juice": 50, "sc orgeat": 112, ... }`

### localStorage Keys (all `_v3` suffixed)

| Key | Type | Contents |
|-----|------|----------|
| `tikiRecipes_v3` | JSON array | All recipes (built-in + user-added) |
| `tikiFavorites_v3` | JSON array | Favorited recipe IDs |
| `tikiCategoryState_v3` | JSON object | `{ categoryName: bool }` expand/collapse |
| `tikiUserInventory_v3` | JSON array | Ingredient IDs user owns |
| `tikiNotes_v3` | JSON object | `{ recipeId: { rating: 1-5, notes: string } }` |
| `tikiHistory_v3` | JSON array | `[{ recipeId, date }, ...]` drink log |
| `tikiCustomIngredients_v3` | JSON object | User-created ingredients |
| `tikiShoppingList_v3` | JSON array | Manual shopping items |
| `tikiTheme_v3` | String | `"light"` or `"dark"` |

Version migration from v2 to v3 is automatic (re-stamps `ingredientIDs`).

---

## UI Sections & Navigation

5-tab navigation bar: **Recipes | My Bar | Add Recipe | Shopping | Settings**

Section switching hides/shows divs with a 150ms opacity fade. Active tab gets a bottom border + ring highlight.

### 1. Recipes (default view)

- **Search**: Real-time filter by name, ingredient, or category
- **Filters**: "Makeable Only" toggle (requires inventory), "+Almost (<=2 missing)" toggle
- **Sort**: Alphabetical or by star rating
- **Surprise Me**: Random recipe selection with shake animation
- **Recipe cards**: Collapsible by category, each card expands to show full details
- **Per-recipe interactions**: 5-star rating, favorite toggle, "Made It!" logging, tasting notes, share, delete (user recipes only)
- **Ingredient badges**: Show `X/Y` available count or "Missing N" per recipe

### 2. My Bar (Inventory)

- 136-ingredient searchable checklist
- Check/uncheck ingredients you have in stock
- Drives the "Makeable Only" filter on recipes

### 3. Add Recipe

- Form: name, category, origin, glassware, ingredients (multiline), instructions, garnish
- Auto-matches ingredient text to the 136-item library
- Confirmation dialog shows matched vs. new ingredients
- Saved to "User Added Recipes" category

### 4. Shopping List

- **Auto-generated**: Missing ingredients from favorited recipes
- **Manual list**: Add/remove custom items
- Checkboxes on favorite-missing items add them to inventory
- "Copy All" copies to clipboard as markdown bullet list
- "Clear Manual" removes all manual items

### 5. Settings

- Dark/light mode toggle
- Backup data: downloads JSON with all localStorage state
- Restore data: upload previous backup (version-checked)

---

## Service Worker Strategy

**Version**: `tiki-app-v3.3.0` (cache name is versioned for auto-busting)

| Resource Type | Strategy | Details |
|--------------|----------|---------|
| App shell (HTML, JSON, icons, images) | **Cache-first** | Pre-cached at install; network fallback |
| CDN resources (Tailwind, Lucide font) | **Stale-while-revalidate** | Serve cached instantly, refresh in background |
| Navigation (offline) | Fallback to cached `index.html` | |
| Non-GET requests | Pass through | |

**Lifecycle**: Install -> pre-cache app shell -> Activate -> purge old caches -> `clients.claim()`. App listens for new worker and shows an "Update available" banner; user taps "Update" which sends `skipWaiting` message.

---

## PWA Manifest

- **Display**: `standalone` (no browser chrome)
- **Orientation**: `portrait-primary`
- **Theme color**: `#CC5A02` (orange)
- **Background color**: `#FFF8F0` (cream)
- **Shortcuts**: "Surprise Me" (`?action=surprise`), "My Bar" (`?section=bar`)
- **Icons**: 192x192 and 512x512, both `any` and `maskable` purposes

---

## Dark Mode

Activated by: saved preference -> system `prefers-color-scheme` -> default light.

Implementation: `document.documentElement.setAttribute('data-theme', 'dark')` with 90+ CSS rules using `[data-theme="dark"]` selector prefix.

| Element | Light | Dark |
|---------|-------|------|
| Background | `#FFF8F0` | `#0f1420` |
| Text | gray-800 | `#e2e8f0` |
| Cards | white | `#1e2535` |
| Headings | amber-800 | `#fbbf24` |
| Accents | teal-700 | `#5eead4` |

---

## Third-Party Dependencies

| Dependency | Purpose | Loaded From |
|-----------|---------|-------------|
| Tailwind CSS (CDN Play) | Utility-first CSS | `cdn.tailwindcss.com` |
| Lucide Static Font v0.473.0 | Icon glyphs (20+ icons) | `cdn.jsdelivr.net` |

Both are cached by the service worker. CSS fallbacks are defined inline for all Tailwind classes used, so the app renders even if the CDN fails.

**Browser APIs used**: Service Worker, localStorage, Fetch, Web Share (with clipboard fallback), File API, matchMedia.

---

## Accessibility

- **Skip-to-content** link (visible on focus)
- **ARIA**: `aria-pressed` on favorites, `aria-expanded` on collapsibles, `aria-live="polite"` for search result counts, `role="radiogroup"` on star ratings
- **Keyboard**: All interactive elements reachable via Tab, activated via Enter/Space
- **Labels**: All form inputs have associated `<label>` elements
- **Semantic HTML**: `<nav>`, `<main>`, `<header>`, proper heading hierarchy

---

## Key JavaScript Functions

**Data**: `loadData()`, `saveRecipes()`, `saveFavorites()`, `saveInventory()`, `saveNotes()`, `saveHistory()`, `saveShoppingList()`

**Rendering**: `renderRecipeList()`, `createRecipeCard()`, `renderInventoryList()`, `renderShoppingList()`, `updateRecipeView()`

**Interactions**: `toggleFavorite()`, `deleteRecipe()`, `logDrink()`, `shareRecipe()`, `handleSurpriseMe()`, `handleAddRecipe()`, `handleBackup()`, `handleRestore()`

**Filtering**: `getFilteredRecipes()` applies search text + makeable filter + almost filter. `normalizeIngredientKey()` strips measurements to match ingredient names.

**Navigation**: `showSection(id)` hides all sections, shows target, updates active nav button.

---

## Design Patterns

1. **Single HTML file** — everything inline, no module system
2. **Ingredient ID matching** — recipes store both readable strings and numeric IDs for fast inventory lookups
3. **Expand/collapse via max-height** — CSS transitions on `max-height: 0` to `max-height: 9999px` with `.open` class
4. **Stale-while-revalidate for CDN** — users always get instant loads, freshness comes on next visit
5. **Backup/restore as JSON** — complete portability with version migration built in
6. **No server** — 100% client-side, GitHub Pages hosting, zero backend

---

## Feature Matrix

| Feature | Storage | Offline | Keyboard | ARIA |
|---------|---------|---------|----------|------|
| View recipes | JSON cache | Yes | Tab/Enter | Yes |
| Search recipes | Real-time | Yes | Text input | Yes |
| Filter by inventory | Checkbox state | Yes | Keyboard | Yes |
| Sort recipes | localStorage | Yes | Dropdown | Yes |
| Rate recipes | `tikiNotes_v3` | Yes | Click/keyboard | Yes |
| Favorite recipes | `tikiFavorites_v3` | Yes | Click/keyboard | Yes |
| Add custom recipes | `tikiRecipes_v3` | Yes | Form | Yes |
| Manage inventory | `tikiUserInventory_v3` | Yes | Checkbox | Yes |
| Track drink history | `tikiHistory_v3` | Yes | Button | N/A |
| Shopping list | `tikiShoppingList_v3` | Yes | Checkbox/input | Yes |
| Dark mode | `tikiTheme_v3` | Yes | Button | Yes |
| Backup data | JSON file download | Yes | Button | Yes |
| Restore data | File upload | Yes | File input | Yes |
| PWA install | Service Worker | N/A | Button | Yes |
| Offline access | Service Worker | Yes | Full | Yes |
| Share recipes | Native/Clipboard | Partial | Button | Yes |
| Tasting notes | `tikiNotes_v3` | Yes | Textarea | Yes |
