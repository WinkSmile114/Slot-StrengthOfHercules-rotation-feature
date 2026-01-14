<script lang="ts">
    import { onMount, onDestroy } from 'svelte'
  import { gsap } from 'gsap'
  import * as PIXI from 'pixi.js'

  // Props using Svelte 5 runes
  interface Props {
    activated?: boolean
    rotation?: number
  }
  
  let { activated = $bindable(false), rotation = $bindable(0) }: Props = $props()

  // Internal state
  let canvasContainer: HTMLDivElement | null = null
  let boardContainer: PIXI.Container | null = null
  let pixiApp: PIXI.Application | null = null
  let currentRotation: number = 0

  // Board dimensions
  const GRID_SIZE = 5 // 5x5 grid
  const SYMBOL_SIZE = 60
  const SYMBOL_SPACING = 10
  const FRAME_PADDING = 20
  const BOARD_WIDTH = GRID_SIZE * SYMBOL_SIZE + (GRID_SIZE - 1) * SYMBOL_SPACING + FRAME_PADDING * 2
  const BOARD_HEIGHT = BOARD_WIDTH
  const CANVAS_WIDTH = BOARD_WIDTH + 100
  const CANVAS_HEIGHT = BOARD_HEIGHT + 100

  // Colors for symbols (simple color blocks)
  const SYMBOL_COLORS = [
    0xff6b6b, // Red
    0x4ecdc4, // Teal
    0x45b7d1, // Blue
    0xf9ca24, // Yellow
    0x6c5ce7, // Purple
    0xa29bfe, // Light Purple
    0xfd79a8, // Pink
    0x00b894, // Green
  ]

  /**
   * Initialize the Pixi application and board container
   */
  onMount(async () => {
    if (!canvasContainer) return

    // Create Pixi application
    pixiApp = new PIXI.Application()
    await pixiApp.init({
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      backgroundColor: 0x000000,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
    })

    canvasContainer.appendChild(pixiApp.canvas)

    // Create the board container
    boardContainer = new PIXI.Container()
    
    // Set pivot to center of the board for rotation
    // This ensures rotation happens around the board's center point
    boardContainer.pivot.x = BOARD_WIDTH / 2
    boardContainer.pivot.y = BOARD_HEIGHT / 2
    
    // Position the container so the pivot is at the visual center
    boardContainer.x = CANVAS_WIDTH / 2
    boardContainer.y = CANVAS_HEIGHT / 2
    
    // Create frame graphics
    const frame = new PIXI.Graphics()
    frame.lineStyle(4, 0x8b7355, 1) // Brown frame color
    frame.beginFill(0x2c2c2c, 0.9) // Dark background
    frame.drawRoundedRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT, 8)
    frame.endFill()
    boardContainer.addChild(frame)
    
    // Create symbols grid
    const symbolsContainer = new PIXI.Container()
    symbolsContainer.x = FRAME_PADDING
    symbolsContainer.y = FRAME_PADDING
    
    for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
      const row = Math.floor(i / GRID_SIZE)
      const col = i % GRID_SIZE
      const colorIndex = i % SYMBOL_COLORS.length
      
      const symbolContainer = new PIXI.Container()
      symbolContainer.x = col * (SYMBOL_SIZE + SYMBOL_SPACING)
      symbolContainer.y = row * (SYMBOL_SIZE + SYMBOL_SPACING)
      
      const symbol = new PIXI.Graphics()
      symbol.beginFill(SYMBOL_COLORS[colorIndex], 1)
      symbol.drawRoundedRect(0, 0, SYMBOL_SIZE, SYMBOL_SIZE, 4)
      symbol.endFill()
      symbolContainer.addChild(symbol)
      
      const text = new PIXI.Text(`${row + 1},${col + 1}`, {
        fill: 0xffffff,
        fontSize: 12,
        align: 'center',
      })
      text.anchor.set(0.5)
      text.x = SYMBOL_SIZE / 2
      text.y = SYMBOL_SIZE / 2
      symbolContainer.addChild(text)
      
      symbolsContainer.addChild(symbolContainer)
    }
    
    boardContainer.addChild(symbolsContainer)
    pixiApp.stage.addChild(boardContainer)
    
    currentRotation = 0
    boardContainer.rotation = currentRotation
  })

  onDestroy(() => {
    if (pixiApp) {
      pixiApp.destroy(true, { children: true, texture: true })
    }
  })

  /**
   * Animate the board rotation with bounce/overshoot effect
   * Animation phases: 0° → ~95° (overshoot) → ~87° (bounce back) → 90° (settle)
   */
  export function rotateBoard() {
    if (!boardContainer || !activated) return

    // Create animation timeline with bounce/elastic effect
    const timeline = gsap.timeline({
      onComplete: () => {
        // Ensure final rotation is exactly 90 degrees (no drift)
        if (boardContainer) {
          boardContainer.rotation = currentRotation * (Math.PI / 180) + Math.PI / 2
          currentRotation = currentRotation + 90
        }
      }
    })

    // Convert current rotation to degrees for easier tracking
    const startRotation = currentRotation
    
    // Phase 1: Rotate to overshoot (~95 degrees)
    timeline.to(boardContainer, {
      rotation: (startRotation + 95) * (Math.PI / 180),
      duration: 0.4,
      ease: 'power2.out'
    })

    // Phase 2: Bounce back slightly (~87 degrees)
    timeline.to(boardContainer, {
      rotation: (startRotation + 87) * (Math.PI / 180),
      duration: 0.2,
      ease: 'power1.inOut'
    })

    // Phase 3: Settle at exactly 90 degrees
    timeline.to(boardContainer, {
      rotation: (startRotation + 90) * (Math.PI / 180),
      duration: 0.3,
      ease: 'elastic.out(1, 0.5)'
    })
  }

  /**
   * Reset the board rotation to 0 degrees
   */
  export function resetRotation() {
    if (!boardContainer) return

    gsap.to(boardContainer, {
      rotation: 0,
      duration: 0.5,
      ease: 'power2.inOut',
      onComplete: () => {
        currentRotation = 0
      }
    })
  }

  // Watch for external rotation changes
  $effect(() => {
    if (rotation !== undefined && boardContainer) {
      boardContainer.rotation = rotation * (Math.PI / 180)
      currentRotation = rotation
    }
  })
</script>

<div bind:this={canvasContainer} class="canvas-container"></div>

<style>
  .canvas-container {
    display: flex;
    justify-content: center;
    align-items: center;
  }

  :global(canvas) {
    display: block;
    margin: 0 auto;
  }
</style>