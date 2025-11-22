<template>
  <div class="flex flex-col items-center gap-4">
    <canvas
      ref="canvas"
      width="560"
      height="480"
      class="border border-surface-300 dark:border-surface-700 rounded cursor-pointer shadow-lg bg-white dark:bg-surface-900"
      @click="handleClick"
    ></canvas>
    <div class="text-sm text-surface-500">
      <span v-if="myTeam && myTeam === currentTurn">
        Click a column to vote for the next move
      </span>
      <span v-else-if="myTeam">
        Waiting for
        <span
          :class="
            currentTurn === 'red'
              ? 'text-red-600 dark:text-red-400'
              : 'text-blue-600 dark:text-blue-400'
          "
        >
          {{ currentTurn === 'red' ? 'Red' : 'Blue' }} Team
        </span>
        to finish their turn
      </span>
      <span v-else>Spectating</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import type { GameState } from '../../stores/games';

const ROWS = 6;
const COLS = 7;

const props = defineProps<{
  state: GameState;
  votes: Record<string, number>;
  currentTurn: 'red' | 'blue';
  myTeam: 'red' | 'blue' | null;
}>();

const emit = defineEmits<{
  (e: 'vote', columnIndex: number): void;
}>();

const canvas = ref<HTMLCanvasElement | null>(null);

function draw() {
  const ctx = canvas.value?.getContext('2d');
  if (!ctx || !canvas.value) return;

  const w = canvas.value.width;
  const h = canvas.value.height;
  const cellW = w / COLS;
  const cellH = h / ROWS;
  const padding = 10;
  const radius = Math.min(cellW, cellH) / 2 - padding;

  // Clear
  ctx.clearRect(0, 0, w, h);

  // Draw board background
  ctx.fillStyle = '#1e40af'; // blue-800
  ctx.fillRect(0, 0, w, h);

  // Draw cells
  const board = props.state?.board ?? Array(ROWS * COLS).fill(null);

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const index = row * COLS + col;
      const cx = col * cellW + cellW / 2;
      const cy = row * cellH + cellH / 2;

      const cell = board[index];

      if (cell === 'red') {
        drawDisc(ctx, cx, cy, radius, '#ef4444'); // red-500
      } else if (cell === 'blue') {
        drawDisc(ctx, cx, cy, radius, '#3b82f6'); // blue-500
      } else {
        // Empty slot - draw as hole
        drawDisc(ctx, cx, cy, radius, '#f3f4f6'); // gray-100
      }
    }
  }

  // Draw votes on columns
  const columnVotes: number[] = Array(COLS).fill(0);
  Object.values(props.votes).forEach((colIndex) => {
    if (colIndex >= 0 && colIndex < COLS) {
      columnVotes[colIndex]++;
    }
  });

  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let col = 0; col < COLS; col++) {
    if (columnVotes[col] > 0) {
      const cx = col * cellW + cellW / 2;
      const cy = cellH / 2;

      // Draw background circle
      ctx.fillStyle =
        props.currentTurn === 'red'
          ? 'rgba(239, 68, 68, 0.8)'
          : 'rgba(59, 130, 246, 0.8)';
      ctx.beginPath();
      ctx.arc(cx, cy - 30, 18, 0, Math.PI * 2);
      ctx.fill();

      // Draw vote count
      ctx.fillStyle = '#ffffff';
      ctx.fillText(columnVotes[col].toString(), cx, cy - 30);
    }
  }
}

function drawDisc(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  // Add shine effect
  const gradient = ctx.createRadialGradient(x - r / 3, y - r / 3, 0, x, y, r);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0.1)');
  ctx.fillStyle = gradient;
  ctx.fill();
}

function getLowestAvailableRow(col: number): number {
  const board = props.state?.board ?? [];

  // Start from bottom row and go up
  for (let row = ROWS - 1; row >= 0; row--) {
    const index = row * COLS + col;
    if (board[index] === null) {
      return row;
    }
  }

  return -1; // Column is full
}

function handleClick(e: MouseEvent) {
  if (!canvas.value || !props.myTeam || props.myTeam !== props.currentTurn)
    return;

  const rect = canvas.value.getBoundingClientRect();
  const x = e.clientX - rect.left;

  // Scale for canvas resolution vs display size
  const scaleX = canvas.value.width / rect.width;
  const cellW = canvas.value.width / COLS;

  let col = Math.floor((x * scaleX) / cellW);

  // Clamp to 0..COLS-1
  col = Math.min(COLS - 1, Math.max(0, col));

  // Check if column has space
  const availableRow = getLowestAvailableRow(col);
  if (availableRow !== -1) {
    // Vote for this column (the column index is what we vote on)
    emit('vote', col);
  }
}

onMounted(() => {
  draw();
});

watch(
  () => [props.state, props.votes, props.currentTurn],
  () => {
    draw();
  },
  { deep: true },
);
</script>
