# Slot Board Animation Demo

A frontend-only demo of a slot game board animation, inspired by Hacksaw's "Strength of Hercules". The board rotates 90 degrees with a bounce effect and jelly-like elasticity when you trigger the spin.

## What it does

When you click "Spin / Rotate", the board moves up slightly while rotating clockwise 90 degrees. It overshoots a bit, bounces back, then settles at exactly 90 degrees. After that, it falls back down to its original position with a nice bounce. The whole thing has a zoom-out/zoom-in effect that makes it feel like jelly.

## Tech stack

- **Svelte 5** with TypeScript
- **Pixi.js** for rendering the board and symbols
- **GSAP** for smooth animations

## Getting started

```bash
npm install
npm run dev
```

Then open your browser and click the buttons. You'll need to activate the feature first before you can spin the board.

## Project structure

- `src/App.svelte` - Main app with controls
- `src/components/SlotBoard.svelte` - The board component with all the animation logic

That's pretty much it. No backend, no game logic, just the visual animation mechanic.