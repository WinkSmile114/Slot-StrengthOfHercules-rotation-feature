<script lang="ts">
  import SlotBoard from './components/SlotBoard.svelte'

  let activated: boolean = $state(false)
  let slotBoardComponent: SlotBoard | null = $state(null)

  function activateFeature() {
    activated = true
  }

  function rotateBoard() {
    if (slotBoardComponent && activated) {
      slotBoardComponent.rotateBoard()
    }
  }

  function resetBoard() {
    if (slotBoardComponent) {
      slotBoardComponent.resetRotation()
    }
  }
</script>

<main>
  <h1>Strength of Hercules - Board Rotation Demo</h1>
  
  <div class="board-container">
    <SlotBoard bind:this={slotBoardComponent} {activated} />
  </div>

  <div class="controls">
    <button 
      class="control-btn activate-btn" 
      onclick={activateFeature}
      disabled={activated}
    >
      {activated ? 'Feature Activated' : 'Activate Feature'}
    </button>
    
    <button 
      class="control-btn rotate-btn" 
      onclick={rotateBoard}
      disabled={!activated}
    >
      Spin / Rotate
    </button>
    
    <button 
      class="control-btn reset-btn" 
      onclick={resetBoard}
    >
      Reset
    </button>
  </div>

  <div class="info">
    <p>Click "Activate Feature" to enable rotation, then use "Spin / Rotate" to animate the board 90° with bounce effect.</p>
  </div>
</main>

<style>
  main {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 2rem;
    min-height: 100vh;
    background: linear-gradient(135deg, #1e1e2e 0%, #2d2d44 100%);
  }

  h1 {
    color: #fff;
    margin-bottom: 2rem;
    font-size: 2rem;
    text-align: center;
  }

  .board-container {
    margin: 2rem 0;
    padding: 1rem;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  }

  .controls {
    display: flex;
    gap: 1rem;
    margin: 2rem 0;
    flex-wrap: wrap;
    justify-content: center;
  }

  .control-btn {
    padding: 0.8rem 2rem;
    font-size: 1rem;
    font-weight: 600;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
    min-width: 150px;
  }

  .activate-btn {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }

  .activate-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }

  .activate-btn:disabled {
    background: #4a5568;
    cursor: not-allowed;
    opacity: 0.6;
  }

  .rotate-btn {
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    color: white;
  }

  .rotate-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(245, 87, 108, 0.4);
  }

  .rotate-btn:disabled {
    background: #4a5568;
    cursor: not-allowed;
    opacity: 0.6;
  }

  .reset-btn {
    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
    color: white;
  }

  .reset-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(79, 172, 254, 0.4);
  }

  .info {
    margin-top: 2rem;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    max-width: 600px;
    text-align: center;
  }

  .info p {
    color: #e2e8f0;
    margin: 0;
    line-height: 1.6;
  }
</style>