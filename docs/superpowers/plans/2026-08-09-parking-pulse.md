# Parking Pulse HTML Game Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dependency-free, responsive HTML parking-and-passenger puzzle game to the existing static site.

**Architecture:** One standalone page owns markup, styling, and game state. A configuration-driven level creates vehicle entities and passenger groups; pure-ish rule functions handle movement, matching, tools, and result checks; `render()` updates the DOM after every state transition.

**Tech Stack:** HTML5, CSS3, vanilla JavaScript, optional local Python HTTP server for verification.

## Global Constraints

- Keep the game in `Games/parking-pulse.html` with no external runtime dependencies.
- Preserve existing static site structure and styles.
- Support mouse, touch, keyboard focus, and responsive narrow-screen layout.
- Use the supplied reference and design document as inspiration without copying image assets.

---

### Task 1: Build the standalone game page

**Files:**
- Create: `Games/parking-pulse.html`
- Modify: `games.html` to add a link card for the new game.

**Interfaces:**
- `createLevel()` returns `{ vehicles, passengers, slots, tools, selectedId, status }`.
- `canMove(vehicle, vehicles)` returns `{ ok, reason }`.
- `moveVehicle(id)` mutates state, loads passengers, and calls `checkResult()`.
- `useTool(name)` mutates state and calls `render()`.
- `render()` reflects current state in the DOM.

- [x] Add the three-zone game shell: header/passenger queue, parking slots, and vehicle board with tool dock.
- [x] Add CSS for the green park backdrop, route card, toy-like vehicles, arrow direction, passenger groups, slot states, feedback, overlays, and responsive layout.
- [x] Add the level data with 6×6 vehicle coordinates, colors, directions, capacities, and passenger groups.
- [x] Implement straight-line path detection against board bounds and other vehicles.
- [x] Implement movement, slot assignment, color matching, capacity-limited loading, full-vehicle departure, and chain reactions.
- [x] Implement failure when all slots are occupied and no vehicle can move, plus victory when passenger count reaches zero.
- [x] Implement reset, queue sort, selected-vehicle removal, and refresh tools with counters and disabled states.
- [x] Wire click, keyboard activation, and tool button events; keep the selected vehicle visually obvious.

### Task 2: Validate behavior and presentation

**Files:**
- Modify: `Games/parking-pulse.html` only if validation finds an issue.

**Interfaces:**
- Browser-facing acceptance checks exercise the same `render`, `moveVehicle`, `useTool`, and reset interactions through visible controls.

- [x] Run a JavaScript syntax check by extracting the inline script and loading it with Node.
- [x] Serve the repository locally and open `Games/parking-pulse.html` in a browser.
- [x] Verify initial layout, narrow viewport fit, vehicle selection, blocked feedback, successful movement, passenger loading, tool counters, reset, victory, and failure overlays.
- [x] Fix any console errors, clipped controls, horizontal overflow, or state mismatch found during verification.
