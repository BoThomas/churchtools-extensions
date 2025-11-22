<template>
  <div class="flex flex-col items-center gap-4">
    <canvas
      ref="canvas"
      width="300"
      height="300"
      class="border border-surface-300 dark:border-surface-700 rounded cursor-pointer shadow-lg bg-white dark:bg-surface-900"
      @click="handleClick"
    ></canvas>
    <div class="text-sm text-surface-500">
      <span v-if="myTeam && myTeam === currentTurn">
        Click a cell to vote for the next move
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

const props = defineProps<{
  state: GameState;
  votes: Record<string, number>;
  currentTurn: 'red' | 'blue';
  myTeam: 'red' | 'blue' | null;
}>();

const emit = defineEmits<{
  (e: 'vote', index: number): void;
}>();

const canvas = ref<HTMLCanvasElement | null>(null);

function draw() {
  const ctx = canvas.value?.getContext('2d');
  if (!ctx || !canvas.value) return;

  const w = canvas.value.width;
  const h = canvas.value.height;
  const cellW = w / 3;
  const cellH = h / 3;

  // Clear
  ctx.clearRect(0, 0, w, h);

  // Grid
  ctx.strokeStyle = '#94a3b8'; // slate-400
  ctx.lineWidth = 2;
  ctx.beginPath();
  // Vertical
  ctx.moveTo(cellW, 0);
  ctx.lineTo(cellW, h);
  ctx.moveTo(cellW * 2, 0);
  ctx.lineTo(cellW * 2, h);
  // Horizontal
  ctx.moveTo(0, cellH);
  ctx.lineTo(w, cellH);
  ctx.moveTo(0, cellH * 2);
  ctx.lineTo(w, cellH * 2);
  ctx.stroke();

  // Cells
  props.state.board.forEach((cell: string | null, i: number) => {
    const x = (i % 3) * cellW;
    const y = Math.floor(i / 3) * cellH;
    const cx = x + cellW / 2;
    const cy = y + cellH / 2;

    if (cell === 'red') {
      drawX(ctx, cx, cy, cellW / 3);
    } else if (cell === 'blue') {
      drawO(ctx, cx, cy, cellW / 3);
    }

    // Draw votes
    const votesForCell = Object.values(props.votes).filter(
      (v) => v === i,
    ).length;
    if (votesForCell > 0 && !cell) {
      ctx.fillStyle =
        props.currentTurn === 'red'
          ? 'rgba(239, 68, 68, 0.5)'
          : 'rgba(59, 130, 246, 0.5)';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(votesForCell.toString(), cx, cy);
    }
  });
}

function drawX(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.strokeStyle = '#ef4444'; // red-500
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x - r, y - r);
  ctx.lineTo(x + r, y + r);
  ctx.moveTo(x + r, y - r);
  ctx.lineTo(x - r, y + r);
  ctx.stroke();
}

function drawO(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.strokeStyle = '#3b82f6'; // blue-500
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
}

function handleClick(e: MouseEvent) {
  if (!canvas.value || !props.myTeam || props.myTeam !== props.currentTurn)
    return;

  const rect = canvas.value.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  // Scale for canvas resolution vs display size
  const scaleX = canvas.value.width / rect.width;
  const scaleY = canvas.value.height / rect.height;

  const cellX = Math.floor((x * scaleX) / (canvas.value.width / 3));
  const cellY = Math.floor((y * scaleY) / (canvas.value.height / 3));
  const index = cellY * 3 + cellX;

  if (props.state.board[index] === null) {
    emit('vote', index);
  }
}

onMounted(draw);
watch(() => [props.state, props.votes], draw, { deep: true });
</script>
