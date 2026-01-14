<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { gsap } from 'gsap'
  import * as PIXI from 'pixi.js'

  interface Props {
    activated?: boolean
    rotation?: number
  }

  // Board layout settings
  const BOARD_CONFIG = {
    GRID_SIZE: 5,
    SYMBOL_SIZE: 60,
    SYMBOL_SPACING: 10,
    FRAME_PADDING: 20,
    CANVAS_PADDING: 100,
  } as const

  // Colors and visual stuff
  const VISUAL_CONFIG = {
    CELL_BG_COLOR: 0xff69b4, // pink
    SYMBOL_COLOR: 0xffd700, // gold
    FRAME_COLOR: 0x8b7355, // brown border
    FRAME_BG_COLOR: 0x2c2c2c, // dark background
    FRAME_BG_ALPHA: 0.9,
    FRAME_LINE_WIDTH: 4,
    FRAME_BORDER_RADIUS: 8,
    CELL_BORDER_RADIUS: 4,
  } as const

  // Text styling
  const TEXT_CONFIG = {
    FONT_FAMILY: 'Arial, sans-serif',
    FONT_SIZE: 36,
    FONT_WEIGHT: 'bold',
  } as const

  // Animation timing and values
  const ANIMATION_CONFIG = {
    UPWARD_MOVEMENT: -80, // negative Y moves up
    ROTATION_OVERSHOOT: 95, // overshoot a bit for bounce effect
    ROTATION_BOUNCE_BACK: 87, // bounce back slightly
    FINAL_ROTATION: 90, // end up at 90 degrees
    ZOOM_OUT_SCALE: 0.90, // shrink to 90% when moving up
    ZOOM_IN_SCALE: 1.0, // back to normal size
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

  // Calculate board dimensions
  const BOARD_WIDTH =
    BOARD_CONFIG.GRID_SIZE * BOARD_CONFIG.SYMBOL_SIZE +
    (BOARD_CONFIG.GRID_SIZE - 1) * BOARD_CONFIG.SYMBOL_SPACING +
    BOARD_CONFIG.FRAME_PADDING * 2

  const BOARD_HEIGHT = BOARD_WIDTH
  const CANVAS_WIDTH = BOARD_WIDTH + BOARD_CONFIG.CANVAS_PADDING
  const CANVAS_HEIGHT = BOARD_HEIGHT + BOARD_CONFIG.CANVAS_PADDING

  let { activated = $bindable(false), rotation = $bindable(0) }: Props = $props()

  // Component state
  let canvasContainer: HTMLDivElement | null = null
  let boardContainer: PIXI.Container | null = null
  let pixiApp: PIXI.Application | null = null
  let currentRotation: number = 0
  let originalBoardY: number = 0
  let symbolGrid: string[] = []

  // Just fills a 5x5 grid with random letters
  function generateSymbolGrid(): string[] {
    const grid: string[] = []
    const totalCells = BOARD_CONFIG.GRID_SIZE * BOARD_CONFIG.GRID_SIZE

    for (let i = 0; i < totalCells; i++) {
      const randomIndex = Math.floor(Math.random() * SYMBOLS.length)
      grid.push(SYMBOLS[randomIndex])
    }

    return grid
  }

  // Creates a single cell with pink bg and gold letter
  function createSymbolCell(symbolChar: string, x: number, y: number): PIXI.Container {
    const container = new PIXI.Container()
    container.x = x
    container.y = y

    const bg = new PIXI.Graphics()
    bg.beginFill(VISUAL_CONFIG.CELL_BG_COLOR, 1)
    bg.drawRoundedRect(0, 0, BOARD_CONFIG.SYMBOL_SIZE, BOARD_CONFIG.SYMBOL_SIZE, VISUAL_CONFIG.CELL_BORDER_RADIUS)
    bg.endFill()
    container.addChild(bg)

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

  // Draws the board frame/border
  function createBoardFrame(): PIXI.Graphics {
    const frame = new PIXI.Graphics()
    frame.lineStyle(VISUAL_CONFIG.FRAME_LINE_WIDTH, VISUAL_CONFIG.FRAME_COLOR, 1)
    frame.beginFill(VISUAL_CONFIG.FRAME_BG_COLOR, VISUAL_CONFIG.FRAME_BG_ALPHA)
    frame.drawRoundedRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT, VISUAL_CONFIG.FRAME_BORDER_RADIUS)
    frame.endFill()
    return frame
  }

  // Sets up the main container with pivot point for rotation
  function initializeBoardContainer(): PIXI.Container {
    const container = new PIXI.Container()

    // Pivot needs to be at center so rotation looks right
    container.pivot.x = BOARD_WIDTH / 2
    container.pivot.y = BOARD_HEIGHT / 2

    // Position it in the middle of the canvas
    container.x = CANVAS_WIDTH / 2
    container.y = CANVAS_HEIGHT / 2

    // Remember where we started for the bounce animation
    originalBoardY = CANVAS_HEIGHT / 2

    return container
  }

  // Builds the grid of symbol cells
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

  // The main animation - board moves up while rotating, then bounces back down
  // The zoom out/in gives it that jelly-like feel
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

    // Make sure scale is set properly before animating
    if (boardContainer.scale.x === 0 || boardContainer.scale.y === 0) {
      boardContainer.scale.set(1, 1)
    }

    const timeline = gsap.timeline({
      onComplete: () => {
        if (boardContainer) {
          // Lock in final values to prevent any drift
          boardContainer.rotation = (startRotation + FINAL_ROTATION) * (Math.PI / 180)
          boardContainer.y = startY
          boardContainer.scale.set(ZOOM_IN_SCALE, ZOOM_IN_SCALE)
          currentRotation = startRotation + FINAL_ROTATION
        }
      },
    })

    // Move up, shrink a bit, and rotate (with overshoot)
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
    }, '<') // sync with scale

    // Rotation bounces back a bit
    timeline.to(boardContainer, {
      rotation: (startRotation + ROTATION_BOUNCE_BACK) * (Math.PI / 180),
      duration: ROTATION_BOUNCE,
      ease: EASE_ROTATION_BOUNCE,
    }, '-=0.05')

    // Settle at exactly 90 degrees
    timeline.to(boardContainer, {
      rotation: (startRotation + FINAL_ROTATION) * (Math.PI / 180),
      y: targetY,
      duration: ROTATION_SETTLE,
      ease: EASE_ROTATION_SETTLE,
    })

    // Fall back down and zoom back to normal size with bounce
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
    }, '<') // sync with scale

    return timeline
  }

  // Public function to trigger the rotation animation
  export function rotateBoard(): void {
    if (!boardContainer || !activated) return

    try {
      createRotationAnimation()
    } catch (error) {
      console.error('Failed to animate board rotation:', error)
    }
  }

  // Reset everything back to starting position
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

  onMount(async () => {
    if (!canvasContainer) return

    try {
      pixiApp = new PIXI.Application()
      await pixiApp.init({
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        backgroundColor: 0x000000,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
      })

      canvasContainer.appendChild(pixiApp.canvas)

      boardContainer = initializeBoardContainer()
      const frame = createBoardFrame()
      const symbolsGrid = createSymbolsGrid()

      boardContainer.addChild(frame)
      boardContainer.addChild(symbolsGrid)
      pixiApp.stage.addChild(boardContainer)

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

  // Sync rotation prop with actual board rotation
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