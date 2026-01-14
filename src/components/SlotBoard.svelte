<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { gsap } from 'gsap'
  import * as PIXI from 'pixi.js'

  // ============================================================================
  // Types & Interfaces
  // ============================================================================
  interface Props {
    activated?: boolean
    rotation?: number
  }

  // ============================================================================
  // Constants
  // ============================================================================
  const BOARD_CONFIG = {
    GRID_SIZE: 5,
    SYMBOL_SIZE: 60,
    SYMBOL_SPACING: 10,
    FRAME_PADDING: 20,
    CANVAS_PADDING: 100,
  } as const

  const VISUAL_CONFIG = {
    CELL_BG_COLOR: 0xff69b4, // Pink
    SYMBOL_COLOR: 0xffd700, // Gold
    FRAME_COLOR: 0x8b7355, // Brown
    FRAME_BG_COLOR: 0x2c2c2c, // Dark grey
    FRAME_BG_ALPHA: 0.9,
    FRAME_LINE_WIDTH: 4,
    FRAME_BORDER_RADIUS: 8,
    CELL_BORDER_RADIUS: 4,
  } as const

  const TEXT_CONFIG = {
    FONT_FAMILY: 'Arial, sans-serif',
    FONT_SIZE: 36,
    FONT_WEIGHT: 'bold',
  } as const

  const ANIMATION_CONFIG = {
    UPWARD_MOVEMENT: -80, // pixels (negative = up)
    ROTATION_OVERSHOOT: 95, // degrees
    ROTATION_BOUNCE_BACK: 87, // degrees
    FINAL_ROTATION: 90, // degrees
    ZOOM_OUT_SCALE: 0.90, // 90% of original size
    ZOOM_IN_SCALE: 1.0, // 100% of original size
    DURATION: {
      UPWARD: 0.4,
      ROTATION_BOUNCE: 0.15,
      ROTATION_SETTLE: 0.2,
      FALL_DOWN: 0.5,
      RESET: 0.5,
    },
    EASING: {
      UPWARD: 'power2.out',
      ROTATION_BOUNCE: 'power1.inOut',
      ROTATION_SETTLE: 'elastic.out(1, 0.5)',
      FALL_DOWN: 'bounce.out',
      RESET: 'power2.inOut',
    },
  } as const

  const SYMBOLS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

  // ============================================================================
  // Computed Constants
  // ============================================================================
  const BOARD_WIDTH =
    BOARD_CONFIG.GRID_SIZE * BOARD_CONFIG.SYMBOL_SIZE +
    (BOARD_CONFIG.GRID_SIZE - 1) * BOARD_CONFIG.SYMBOL_SPACING +
    BOARD_CONFIG.FRAME_PADDING * 2

  const BOARD_HEIGHT = BOARD_WIDTH
  const CANVAS_WIDTH = BOARD_WIDTH + BOARD_CONFIG.CANVAS_PADDING
  const CANVAS_HEIGHT = BOARD_HEIGHT + BOARD_CONFIG.CANVAS_PADDING

  // ============================================================================
  // Component Props
  // ============================================================================
  let { activated = $bindable(false), rotation = $bindable(0) }: Props = $props()

  // ============================================================================
  // State
  // ============================================================================
  let canvasContainer: HTMLDivElement | null = null
  let boardContainer: PIXI.Container | null = null
  let pixiApp: PIXI.Application | null = null
  let currentRotation: number = 0
  let originalBoardY: number = 0
  let symbolGrid: string[] = []

  // ============================================================================
  // Utility Functions
  // ============================================================================
  /**
   * Generates a random symbol grid (5x5)
   * @returns Array of 25 random symbols from A-Z
   */
  function generateSymbolGrid(): string[] {
    const grid: string[] = []
    const totalCells = BOARD_CONFIG.GRID_SIZE * BOARD_CONFIG.GRID_SIZE

    for (let i = 0; i < totalCells; i++) {
      const randomIndex = Math.floor(Math.random() * SYMBOLS.length)
      grid.push(SYMBOLS[randomIndex])
    }

    return grid
  }

  /**
   * Creates a symbol cell with background and text
   * @param symbolChar - The character to display
   * @param x - X position
   * @param y - Y position
   * @returns Container with background and text
   */
  function createSymbolCell(symbolChar: string, x: number, y: number): PIXI.Container {
    const container = new PIXI.Container()
    container.x = x
    container.y = y

    // Background
    const bg = new PIXI.Graphics()
    bg.beginFill(VISUAL_CONFIG.CELL_BG_COLOR, 1)
    bg.drawRoundedRect(0, 0, BOARD_CONFIG.SYMBOL_SIZE, BOARD_CONFIG.SYMBOL_SIZE, VISUAL_CONFIG.CELL_BORDER_RADIUS)
    bg.endFill()
    container.addChild(bg)

    // Text
    const textStyle = new PIXI.TextStyle({
      fontFamily: TEXT_CONFIG.FONT_FAMILY,
      fontSize: TEXT_CONFIG.FONT_SIZE,
      fontWeight: TEXT_CONFIG.FONT_WEIGHT,
      fill: VISUAL_CONFIG.SYMBOL_COLOR,
      align: 'center',
    })

    const text = new PIXI.Text(symbolChar, textStyle)
    text.anchor.set(0.5)
    text.x = BOARD_CONFIG.SYMBOL_SIZE / 2
    text.y = BOARD_CONFIG.SYMBOL_SIZE / 2
    container.addChild(text)

    return container
  }

  /**
   * Creates the board frame
   * @returns Graphics object representing the frame
   */
  function createBoardFrame(): PIXI.Graphics {
    const frame = new PIXI.Graphics()
    frame.lineStyle(VISUAL_CONFIG.FRAME_LINE_WIDTH, VISUAL_CONFIG.FRAME_COLOR, 1)
    frame.beginFill(VISUAL_CONFIG.FRAME_BG_COLOR, VISUAL_CONFIG.FRAME_BG_ALPHA)
    frame.drawRoundedRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT, VISUAL_CONFIG.FRAME_BORDER_RADIUS)
    frame.endFill()
    return frame
  }

  /**
   * Initializes the board container with proper pivot and positioning
   * @returns Configured board container
   */
  function initializeBoardContainer(): PIXI.Container {
    const container = new PIXI.Container()

    // Set pivot to center for rotation
    container.pivot.x = BOARD_WIDTH / 2
    container.pivot.y = BOARD_HEIGHT / 2

    // Position at visual center
    container.x = CANVAS_WIDTH / 2
    container.y = CANVAS_HEIGHT / 2

    // Store original Y for bounce animation
    originalBoardY = CANVAS_HEIGHT / 2

    return container
  }

  /**
   * Creates the symbols grid container
   * @returns Container with all symbol cells
   */
  function createSymbolsGrid(): PIXI.Container {
    const container = new PIXI.Container()
    container.x = BOARD_CONFIG.FRAME_PADDING
    container.y = BOARD_CONFIG.FRAME_PADDING

    symbolGrid = generateSymbolGrid()

    for (let i = 0; i < symbolGrid.length; i++) {
      const row = Math.floor(i / BOARD_CONFIG.GRID_SIZE)
      const col = i % BOARD_CONFIG.GRID_SIZE
      const symbolChar = symbolGrid[i]

      const x = col * (BOARD_CONFIG.SYMBOL_SIZE + BOARD_CONFIG.SYMBOL_SPACING)
      const y = row * (BOARD_CONFIG.SYMBOL_SIZE + BOARD_CONFIG.SYMBOL_SPACING)

      const cell = createSymbolCell(symbolChar, x, y)
      container.addChild(cell)
    }

    return container
  }

  // ============================================================================
  // Animation Functions
  // ============================================================================
  /**
   * Creates the rotation animation timeline with jelly-like elasticity
   * Animation: Move up (zoom out) → Rotate 90° → Fall down (zoom in) with bounce
   */
  function createRotationAnimation(): gsap.core.Timeline {
    if (!boardContainer) {
      throw new Error('Board container not initialized')
    }

    const { UPWARD_MOVEMENT, ROTATION_OVERSHOOT, ROTATION_BOUNCE_BACK, FINAL_ROTATION, ZOOM_OUT_SCALE, ZOOM_IN_SCALE } = ANIMATION_CONFIG
    const { UPWARD, ROTATION_BOUNCE, ROTATION_SETTLE, FALL_DOWN } = ANIMATION_CONFIG.DURATION
    const { UPWARD: EASE_UPWARD, ROTATION_BOUNCE: EASE_ROTATION_BOUNCE, ROTATION_SETTLE: EASE_ROTATION_SETTLE, FALL_DOWN: EASE_FALL_DOWN } = ANIMATION_CONFIG.EASING

    const startY = boardContainer.y
    const startRotation = currentRotation
    const targetY = startY + UPWARD_MOVEMENT

    // Ensure scale is initialized
    if (boardContainer.scale.x === 0 || boardContainer.scale.y === 0) {
      boardContainer.scale.set(1, 1)
    }

    const timeline = gsap.timeline({
      onComplete: () => {
        if (boardContainer) {
          // Ensure final values (prevent drift)
          boardContainer.rotation = (startRotation + FINAL_ROTATION) * (Math.PI / 180)
          boardContainer.y = startY
          boardContainer.scale.set(ZOOM_IN_SCALE, ZOOM_IN_SCALE)
          currentRotation = startRotation + FINAL_ROTATION
        }
      },
    })

    // Phase 1: Move up + Zoom out + Rotate to overshoot
    timeline.to(boardContainer.scale, {
      x: ZOOM_OUT_SCALE,
      y: ZOOM_OUT_SCALE,
      duration: UPWARD,
      ease: EASE_UPWARD,
    })

    timeline.to(boardContainer, {
      y: targetY,
      rotation: (startRotation + ROTATION_OVERSHOOT) * (Math.PI / 180),
      duration: UPWARD,
      ease: EASE_UPWARD,
    }, '<') // Synchronize with scale animation

    // Phase 2: Bounce back rotation
    timeline.to(boardContainer, {
      rotation: (startRotation + ROTATION_BOUNCE_BACK) * (Math.PI / 180),
      duration: ROTATION_BOUNCE,
      ease: EASE_ROTATION_BOUNCE,
    }, '-=0.05')

    // Phase 3: Settle rotation at 90°
    timeline.to(boardContainer, {
      rotation: (startRotation + FINAL_ROTATION) * (Math.PI / 180),
      y: targetY,
      duration: ROTATION_SETTLE,
      ease: EASE_ROTATION_SETTLE,
    })

    // Phase 4: Fall down + Zoom in with bounce
    timeline.to(boardContainer.scale, {
      x: ZOOM_IN_SCALE,
      y: ZOOM_IN_SCALE,
      duration: FALL_DOWN,
      ease: EASE_FALL_DOWN,
    }, '-=0.05')

    timeline.to(boardContainer, {
      y: startY,
      duration: FALL_DOWN,
      ease: EASE_FALL_DOWN,
    }, '<') // Synchronize with scale animation

    return timeline
  }

  // ============================================================================
  // Public API
  // ============================================================================
  /**
   * Animates the board rotation with bounce and jelly-like elasticity
   */
  export function rotateBoard(): void {
    if (!boardContainer || !activated) return

    try {
      createRotationAnimation()
    } catch (error) {
      console.error('Failed to animate board rotation:', error)
    }
  }

  /**
   * Resets the board rotation to 0 degrees
   */
  export function resetRotation(): void {
    if (!boardContainer) return

    gsap.to(boardContainer, {
      rotation: 0,
      duration: ANIMATION_CONFIG.DURATION.RESET,
      ease: ANIMATION_CONFIG.EASING.RESET,
      onComplete: () => {
        currentRotation = 0
      },
    })
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================
  onMount(async () => {
    if (!canvasContainer) return

    try {
      // Initialize Pixi application
      pixiApp = new PIXI.Application()
      await pixiApp.init({
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        backgroundColor: 0x000000,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
      })

      canvasContainer.appendChild(pixiApp.canvas)

      // Initialize board
      boardContainer = initializeBoardContainer()
      const frame = createBoardFrame()
      const symbolsGrid = createSymbolsGrid()

      boardContainer.addChild(frame)
      boardContainer.addChild(symbolsGrid)
      pixiApp.stage.addChild(boardContainer)

      // Initialize rotation
      currentRotation = 0
      boardContainer.rotation = currentRotation
    } catch (error) {
      console.error('Failed to initialize board:', error)
    }
  })

  onDestroy(() => {
    if (pixiApp) {
      pixiApp.destroy(true, { children: true, texture: true })
    }
  })

  // ============================================================================
  // Reactive Effects
  // ============================================================================
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