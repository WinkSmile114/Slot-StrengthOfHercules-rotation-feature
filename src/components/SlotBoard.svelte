<script lang="ts">
    import { onMount, onDestroy } from 'svelte'
  import { gsap } from 'gsap'
  import * as PIXI from 'pixi.js'

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
  let originalBoardY: number = 0 // Store original Y position for bounce animation

  // Board dimensions
  const GRID_SIZE = 5 // 5x5 grid
  const SYMBOL_SIZE = 60
  const SYMBOL_SPACING = 10
  const FRAME_PADDING = 20
  const BOARD_WIDTH = GRID_SIZE * SYMBOL_SIZE + (GRID_SIZE - 1) * SYMBOL_SPACING + FRAME_PADDING * 2
  const BOARD_HEIGHT = BOARD_WIDTH
  const CANVAS_WIDTH = BOARD_WIDTH + 100
  const CANVAS_HEIGHT = BOARD_HEIGHT + 100

  // Available symbols: A-Z letters
  const SYMBOLS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
  
  // Cell background color: Same pink color for all cells
  const CELL_BG_COLOR = 0xff69b4 // Pink
  
  // Symbol color: Gold for all characters
  const SYMBOL_COLOR = 0xffd700 // Gold
  
  // Generate random symbol grid (allows duplicates)
  function generateSymbolGrid(): string[] {
    const grid: string[] = []
    for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
      // Randomly select from A-Z, allowing duplicates
      const randomIndex = Math.floor(Math.random() * SYMBOLS.length)
      grid.push(SYMBOLS[randomIndex])
    }
    return grid
  }
  
  let symbolGrid = generateSymbolGrid()

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
    
    // Store original Y position for bounce animation
    originalBoardY = CANVAS_HEIGHT / 2
    
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
      const symbolChar = symbolGrid[i]
      
      const symbolContainer = new PIXI.Container()
      symbolContainer.x = col * (SYMBOL_SIZE + SYMBOL_SPACING)
      symbolContainer.y = row * (SYMBOL_SIZE + SYMBOL_SPACING)
      
      // Dark background for symbol cell (same color for all)
      const bg = new PIXI.Graphics()
      bg.beginFill(CELL_BG_COLOR, 1) // Same dark grey background for all cells
      bg.drawRoundedRect(0, 0, SYMBOL_SIZE, SYMBOL_SIZE, 4)
      bg.endFill()
      symbolContainer.addChild(bg)
      
      // Letter symbol with styling - all gold color
      const textStyle = new PIXI.TextStyle({
        fontFamily: 'Arial, sans-serif',
        fontSize: 36,
        fontWeight: 'bold',
        fill: SYMBOL_COLOR, // Gold color for all characters
        align: 'center',
      })
      const text = new PIXI.Text(symbolChar, textStyle)
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
   * Animate the board: Move up while rotating 90°, then immediately bounce back down
   * With jelly-like elasticity: zoom out when moving up, zoom in when falling down
   * Animation sequence:
   * 1. Move up (+Y) + zoom out + rotate to overshoot (~95 degrees)
   * 2. Bounce back rotation slightly (87°) while still moving up
   * 3. Settle rotation at 90° and reach top position (still zoomed out)
   * 4. Immediately fall back down + zoom in to original position with bounce
   */
  export function rotateBoard() {
    if (!boardContainer || !activated) return

    // Animation parameters
    const UPWARD_MOVEMENT = -80 // Move up by 80 pixels (negative Y = up)
    const ROTATION_OVERSHOOT = 95 // Overshoot to 95 degrees
    const ROTATION_BOUNCE_BACK = 87 // Bounce back to 87 degrees
    const FINAL_ROTATION = 90 // Final rotation at 90 degrees
    const ZOOM_OUT_SCALE = 0.90 // Zoom out to 90% when moving up (jelly effect)
    const ZOOM_IN_SCALE = 1.0 // Zoom back to 100% when falling down

    // Store starting values
    const startY = boardContainer.y
    const startRotation = currentRotation
    const startScale = boardContainer.scale.x || 1 // Get current scale or default to 1
    const targetY = startY + UPWARD_MOVEMENT // Move up (negative Y = up in screen coordinates)

    // Ensure scale is initialized
    if (boardContainer.scale.x === 0 || boardContainer.scale.y === 0) {
      boardContainer.scale.set(1, 1)
    }

    // Create animation timeline
    const timeline = gsap.timeline({
      onComplete: () => {
        // Ensure final values are correct (no drift)
        if (boardContainer) {
          boardContainer.rotation = (startRotation + FINAL_ROTATION) * (Math.PI / 180)
          boardContainer.y = startY // Ensure final Y is correct
          boardContainer.scale.set(ZOOM_IN_SCALE, ZOOM_IN_SCALE) // Ensure final scale is correct
          currentRotation = startRotation + FINAL_ROTATION
        }
      }
    })

    // Phase 1: Move up + Zoom out + Rotate to overshoot (~95 degrees)
    // Jelly effect: zoom out to 90% while moving up
    timeline.to(boardContainer.scale, {
      x: ZOOM_OUT_SCALE,
      y: ZOOM_OUT_SCALE,
      duration: 0.4,
      ease: 'power2.out'
    })
    timeline.to(boardContainer, {
      y: targetY,
      rotation: (startRotation + ROTATION_OVERSHOOT) * (Math.PI / 180),
      duration: 0.4,
      ease: 'power2.out'
    }, '<') // Start at the same time as scale animation

    // Phase 2: Bounce back rotation slightly (~87 degrees) while continuing to top
    // Keep zoomed out during rotation bounce
    timeline.to(boardContainer, {
      rotation: (startRotation + ROTATION_BOUNCE_BACK) * (Math.PI / 180),
      duration: 0.15,
      ease: 'power1.inOut'
    }, '-=0.05') // Start slightly before previous phase ends

    // Phase 3: Settle rotation at exactly 90 degrees and ensure at top position
    // Still zoomed out at top (90%)
    timeline.to(boardContainer, {
      rotation: (startRotation + FINAL_ROTATION) * (Math.PI / 180),
      y: targetY, // Ensure we're at top position
      duration: 0.2,
      ease: 'elastic.out(1, 0.5)'
    })

    // Phase 4: Immediately fall back down + zoom in to original size (100%) with bounce
    // Jelly effect: zoom back to 100% while falling down
    timeline.to(boardContainer.scale, {
      x: ZOOM_IN_SCALE,
      y: ZOOM_IN_SCALE,
      duration: 0.5,
      ease: 'bounce.out' // Bounce effect when landing with zoom in
    }, '-=0.05') // Start slightly before rotation settles
    timeline.to(boardContainer, {
      y: startY,
      duration: 0.5,
      ease: 'bounce.out' // Bounce effect when landing
    }, '<') // Start at the same time as scale animation
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