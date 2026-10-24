# Uneven Lube Film Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render hand-applied lube as irregular swirls and viscous blobs, with visible thick and thin areas on housing, slider, and stabilizer wire.

**Architecture:** Extend the existing grease geometry in `ModTools.tsx` with deterministic width/thickness variation, curved smear ridges, and rounded pooled spots. Vary radius around and along wire paths, placing visible deposits at hooks and bends. Keep current lube color/material selection and progress-driven reveal so all stations and assembled stabilizers share the same appearance.

**Tech Stack:** TypeScript, Three.js BufferGeometry, React Three Fiber.

**Spec:** `docs/superpowers/specs/2026-10-24-uneven-lube-film-design.md`

## Global Constraints

- Preserve current lube color and viscosity behavior.
- Keep irregularity deterministic in model coordinates to prevent animation flicker.
- Preserve the current progress animation on housing, slider, and wire.
- Keep the existing public component interfaces.

## Review Focus

- Partial progress must reveal connected swirled strokes and blobs without detached chunks.
- Thin and thick sections must remain visible for clear and opaque lubes.
- Wire swirls/deposits must follow hooks and bends without gaps or self-intersection spikes.
- The same stroke geometry must remain aligned to each target surface.
- Static assembled wire coating must match the completed station coating.

---

### Task 1: Build irregular grease film geometry

**Files:**
- Modify: `src/scene/models/ModTools.tsx`

**Interfaces:**
- Keep `GreaseStroke`, `WireGrease`, `WireCoating`, `Stroke`, and `lubeLook` public signatures unchanged.
- Add private deterministic geometry helpers in `ModTools.tsx` for variable-width/height surface strokes and variable-radius wire tubes.

- [x] Replace the uniform capsule used by `GreaseStroke` with segmented convex film geometry: vary width and height, add a shallow curved smear ridge, and add rounded pooled spots at deterministic stroke positions; preserve the existing local frame and progress reveal.
- [x] Replace constant-radius wire geometry with a segmented tube whose radius varies smoothly along the path and circumference; form visible pooled spots near hooks and bends; preserve the existing grease path and progress reveal.
- [x] Keep all irregular variation seeded from stable stroke/path coordinates and preserve current grease material colors and viscosity-derived base thickness.
- [x] Inspect code paths for station and assembled wire users to confirm they still render through the same components and interfaces.
