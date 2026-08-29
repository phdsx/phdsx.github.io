# PHDSX Homepage UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the existing PHDSX homepage into a balanced, clean workbench that keeps search and tools prominent while making games, blog, novels, and directory content easy to discover.

**Architecture:** Keep the existing static HTML structure, shared `assets/site.css` visual system, and `assets/site.js` search/navigation behavior. Adjust homepage markup only where hierarchy needs to be clearer, then use scoped homepage selectors to tune spacing, surfaces, typography, responsive ordering, and interaction states without changing routes or adding runtime dependencies.

**Tech Stack:** HTML5, CSS3, existing vanilla JavaScript, local static HTTP server, in-app browser visual checks.

## Global Constraints

- Keep all existing homepage URLs and relative paths unchanged.
- Preserve the existing Clarity script and search behavior, including category filters, hot-search suggestions, keyboard navigation, and the `雷劈计算器` catalog entry.
- Do not add login, messages, backend calls, new dependencies, or new routes.
- Keep the existing 208px desktop sidebar and top-navigation behavior below the current responsive breakpoints.
- Use existing generated icon and game image assets; do not introduce placeholder artwork.
- Maintain no horizontal overflow at 390px wide and keep primary controls comfortably clickable.

---

### Task 1: Restructure homepage content hierarchy

**Files:**
- Modify: `index.html:20-171`

**Interfaces:**
- Consumes: existing `data-home-search`, `data-search-category`, `data-search-suggestion`, and `data-home-clock` hooks consumed by `assets/site.js`.
- Produces: semantic homepage sections with unchanged route targets and existing search hooks.

- [ ] **Step 1: Keep the search contract while tightening the search lead**

Retain the existing search input, category buttons, submit button, result panel, hot-search buttons, and ARIA attributes. Change only the visible copy and surrounding grouping so the primary line communicates fast access to the site, for example:

```html
<p class="portal-eyebrow">PHDSX PERSONAL HUB</p>
<h1 id="home-title">快速找到你要用的内容</h1>
<p class="portal-search-lede">工具、游戏、博客、小说与黄页，都从这里开始。</p>
```

Keep every existing `data-*` attribute unchanged so `assets/site.js` continues to render results.

- [ ] **Step 2: Reorder the first dashboard row around the balanced goal**

Keep the three existing panels but make the intended hierarchy explicit in the markup order: `portal-direct` first for the main tool surface, `portal-ranking` second for frequent routes, and `overview-panel` third for lightweight site status. Preserve every existing link and icon source. Add a short helper line to the direct panel that explains the grouping without becoming a feature description block.

- [ ] **Step 3: Add explicit discovery labels to the lower content rail**

Keep the existing `home-layout`, `home-content`, and `home-rail` structure. Add stable modifier classes to the rail sections so CSS can distinguish recent reading from directory shortcuts without changing their links:

```html
<section class="rail-panel rail-panel--reading">...</section>
<section class="rail-panel rail-panel--directory">...</section>
```

Do not add nested cards or account-oriented controls.

- [ ] **Step 4: Run a route and hook check**

Run:

```powershell
rg -n "data-home-search|data-search-category|data-search-suggestion|data-home-clock|href=" index.html
```

Expected: all existing search hooks remain present, and the existing tool, game, blog, novel, and directory links still appear in the homepage source.

### Task 2: Implement the clean workbench visual system

**Files:**
- Modify: `assets/site.css:566-736`
- Modify: `index.html:15,20-171` only if the cache query or modifier hooks need updating

**Interfaces:**
- Consumes: homepage classes from `index.html` and existing root variables such as `--bg`, `--panel`, `--panel-soft`, `--line`, `--brand`, and `--muted`.
- Produces: a desktop fixed-sidebar workbench and a single-column mobile homepage with stable image slots.

- [ ] **Step 1: Define the homepage hierarchy tokens**

Add a compact homepage-only surface layer near the existing portal rules:

```css
.portal-home {
  --home-section-gap: clamp(24px, 3vw, 38px);
  --home-radius: 8px;
  --home-soft-line: #e8edf3;
}
```

Use these values for homepage spacing and avoid introducing a second palette.

- [ ] **Step 2: Give the search area a stronger but lighter first-screen rhythm**

Style `.portal-search` as the visual starting point with a restrained bottom divider, tighter eyebrow/title spacing, readable supporting text, and a wider input. Keep the search result panel above the dashboard using its existing z-index. Make category buttons read as a segmented filter row using existing border and brand colors, not rounded marketing pills.

- [ ] **Step 3: Make the first dashboard row feel like one workbench**

Update `.portal-dashboard` to use a three-column desktop grid with the tool-direct panel receiving the largest track. Keep panels as flat grouped surfaces with one border and a small radius; remove excess shadow depth. Give the direct panel enough width for four icon columns, keep ranking rows as separators, and align the overview clock and counts to the same vertical rhythm.

- [ ] **Step 4: Refine lower sections without card nesting**

Use `.home-section` spacing and `.home-section-head` typography to separate the tool groups and games section with whitespace and a single rule. Keep tool groups and game tiles individually framed because they are independent navigation objects, but reduce shadow and hover movement so the page stays quiet and work-focused. Style the new `rail-panel--reading` and `rail-panel--directory` modifiers as one grouped list surface each.

- [ ] **Step 5: Protect image and text dimensions**

Keep `.portal-app-grid img`, `.feature-icon`, and `.game-image` at stable dimensions with `object-fit: cover`. Ensure long labels such as `父母性别计算器` wrap inside their grid cells instead of forcing overflow. Do not use viewport-scaled font sizes or negative letter spacing.

- [ ] **Step 6: Tune responsive breakpoints**

At desktop, keep `body.has-site-sidebar` at 208px padding. At the existing 900px breakpoint, let the sidebar become the top navigation and collapse the dashboard to one column. At 620px, make the search lead compact, allow the category row to scroll horizontally, use one-column tool links where needed, and keep the order `search -> shortcuts -> tools -> games -> reading -> directory`. Add `overflow-x: hidden` only to the homepage root if a measured child still causes overflow; do not hide a real control.

### Task 3: Verify the homepage experience

**Files:**
- Modify: `index.html` or `assets/site.css` only when a verification finding requires a focused fix.

**Interfaces:**
- Browser-facing checks exercise the existing search input, category controls, result links, homepage navigation, responsive layout, and image slots.

- [ ] **Step 1: Run static checks**

Run:

```powershell
$env:PATH='C:\Users\YUE\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;'+$env:PATH
node --check assets/site.js
git -c safe.directory='D:/code/html/phdsx.github.io' diff --check
```

Expected: JavaScript syntax passes and `git diff --check` reports no whitespace errors.

- [ ] **Step 2: Start or reuse the local static server**

Serve `D:\code\html\phdsx.github.io` on port `4178` and reload the homepage after the files change.

- [ ] **Step 3: Verify desktop composition**

At the default desktop viewport, confirm the 208px sidebar stays fixed, the search area is the clear first action, the tool-direct panel is the strongest dashboard surface, and the games/reading/directory sections remain visible lower on the page without overlapping.

- [ ] **Step 4: Verify search behavior**

Use the visible search input to enter `雷`, confirm the result list contains `雷劈计算器`, switch to the `工具` category, and confirm the result remains available. Verify that a hot-search suggestion still fills and renders the search input.

- [ ] **Step 5: Verify mobile composition**

At `390 x 844`, confirm there is no horizontal scrollbar, the category row can scroll without moving the page, the search button and input remain usable, and long tool labels wrap without overlapping neighboring content.

- [ ] **Step 6: Verify navigation and asset loading**

Check that the homepage links for tools, games, blog, novels, and directory still resolve, and that the visible icon/game image elements have non-zero dimensions. Review the browser console for errors and fix only issues introduced by this homepage pass.
