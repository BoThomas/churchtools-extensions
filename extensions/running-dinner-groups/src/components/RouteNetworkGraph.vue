<template>
  <Fieldset legend="Connection Overview" toggleable :collapsed="true">
    <div class="flex items-center justify-end gap-4 text-xs mb-4">
      <button
        class="flex items-center gap-1 px-2 py-1 rounded transition-colors cursor-pointer"
        :class="
          visibleMeals.starter
            ? 'bg-blue-100 dark:bg-blue-900/30'
            : 'opacity-40 hover:opacity-70'
        "
        @click="toggleMeal('starter')"
      >
        <span class="w-3 h-0.5 bg-blue-500 rounded"></span>
        <span class="text-surface-600 dark:text-surface-400">Starter</span>
      </button>
      <button
        class="flex items-center gap-1 px-2 py-1 rounded transition-colors cursor-pointer"
        :class="
          visibleMeals.mainCourse
            ? 'bg-green-100 dark:bg-green-900/30'
            : 'opacity-40 hover:opacity-70'
        "
        @click="toggleMeal('mainCourse')"
      >
        <span class="w-3 h-0.5 bg-green-500 rounded"></span>
        <span class="text-surface-600 dark:text-surface-400">Main</span>
      </button>
      <button
        class="flex items-center gap-1 px-2 py-1 rounded transition-colors cursor-pointer"
        :class="
          visibleMeals.dessert
            ? 'bg-pink-100 dark:bg-pink-900/30'
            : 'opacity-40 hover:opacity-70'
        "
        @click="toggleMeal('dessert')"
      >
        <span class="w-3 h-0.5 bg-pink-500 rounded"></span>
        <span class="text-surface-600 dark:text-surface-400">Dessert</span>
      </button>
    </div>
    <div ref="containerRef" class="relative w-full" style="height: 400px">
      <canvas
        ref="canvasRef"
        class="absolute inset-0"
        @mousemove="handleMouseMove"
        @mouseleave="hoveredNode = null"
      ></canvas>
      <!-- Tooltip -->
      <div
        v-if="hoveredNode"
        class="absolute pointer-events-none bg-surface-0 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg shadow-lg p-2 text-sm z-10"
        :style="{
          left: `${tooltipPos.x}px`,
          top: `${tooltipPos.y}px`,
          transform: 'translate(-50%, -100%) translateY(-8px)',
        }"
      >
        <div class="font-semibold">Group {{ hoveredNode.groupNumber }}</div>
        <div class="text-xs text-surface-500">
          {{ hoveredNode.members.join(', ') }}
        </div>
        <div class="text-xs text-surface-400 mt-1">
          Hosts: {{ hoveredNode.hostsMeal }}
        </div>
      </div>
    </div>
  </Fieldset>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import type { CategoryValue } from '@churchtools-extensions/persistance';
import type { DinnerGroup, Route, GroupMember } from '@/types/models';
import { getMealLabelWithoutEmoji } from '@/types/models';
import Fieldset from '@churchtools-extensions/prime-volt/Fieldset.vue';

const props = defineProps<{
  routes: Omit<Route, 'id' | 'createdAt' | 'updatedAt'>[];
  dinnerGroups: CategoryValue<DinnerGroup>[];
  members: GroupMember[];
}>();

const containerRef = ref<HTMLDivElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);

interface Node {
  id: number;
  groupNumber: number;
  members: string[];
  hostsMeal: string;
  x: number;
  y: number;
  radius: number;
}

interface Edge {
  from: number;
  to: number;
  meal: string;
  color: string;
}

const nodes = ref<Node[]>([]);
const edges = ref<Edge[]>([]);
const hoveredNode = ref<Node | null>(null);
const tooltipPos = ref({ x: 0, y: 0 });

const visibleMeals = ref({
  starter: true,
  mainCourse: true,
  dessert: true,
});

function toggleMeal(meal: 'starter' | 'mainCourse' | 'dessert') {
  visibleMeals.value[meal] = !visibleMeals.value[meal];
  draw();
}

const mealColors: Record<string, string> = {
  starter: '#3b82f6', // blue-500
  mainCourse: '#22c55e', // green-500
  dessert: '#ec4899', // pink-500
};

// Build graph data from routes
const graphData = computed(() => {
  const nodeMap = new Map<number, Node>();
  const edgeList: Edge[] = [];

  // Create nodes for each dinner group
  props.dinnerGroups.forEach((group) => {
    const route = props.routes.find((r) => r.dinnerGroupId === group.id);
    const hostedMeal =
      route?.stops.find((s) => s.hostDinnerGroupId === group.id)?.meal || '';

    const groupMembers = props.members
      .filter((m) => group.value.memberPersonIds.includes(m.personId))
      .map((m) => {
        const lastInitial = m.person.lastName?.charAt(0);
        return lastInitial
          ? `${m.person.firstName} ${lastInitial}.`
          : m.person.firstName;
      });

    nodeMap.set(group.id, {
      id: group.id,
      groupNumber: group.value.groupNumber,
      members: groupMembers,
      hostsMeal: getMealLabelWithoutEmoji(hostedMeal),
      x: 0,
      y: 0,
      radius: 30 + groupMembers.length * 5,
    });
  });

  // Create edges for each meal connection
  props.routes.forEach((route) => {
    route.stops.forEach((stop) => {
      // Only create edge if this group is NOT the host (visiting someone else)
      if (stop.hostDinnerGroupId !== route.dinnerGroupId) {
        edgeList.push({
          from: route.dinnerGroupId,
          to: stop.hostDinnerGroupId,
          meal: stop.meal,
          color: mealColors[stop.meal] || '#888',
        });
      }
    });
  });

  // Sort nodes by groupNumber for consistent positioning
  const sortedNodes = Array.from(nodeMap.values()).sort(
    (a, b) => a.groupNumber - b.groupNumber,
  );

  return { nodes: sortedNodes, edges: edgeList };
});

// Position nodes in a circle
function positionNodes(width: number, height: number) {
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2 - 60;

  const nodeCount = graphData.value.nodes.length;
  graphData.value.nodes.forEach((node, index) => {
    const angle = (index / nodeCount) * 2 * Math.PI - Math.PI / 2;
    node.x = centerX + radius * Math.cos(angle);
    node.y = centerY + radius * Math.sin(angle);
  });

  nodes.value = graphData.value.nodes;
  edges.value = graphData.value.edges;
}

function draw() {
  const canvas = canvasRef.value;
  const container = containerRef.value;
  if (!canvas || !container) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const rect = container.getBoundingClientRect();

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;

  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, rect.width, rect.height);

  positionNodes(rect.width, rect.height);

  // Filter edges by visible meals
  const visibleEdges = edges.value.filter(
    (edge) => visibleMeals.value[edge.meal as keyof typeof visibleMeals.value],
  );

  // Draw edges with arrows
  visibleEdges.forEach((edge) => {
    const fromNode = nodes.value.find((n) => n.id === edge.from);
    const toNode = nodes.value.find((n) => n.id === edge.to);
    if (!fromNode || !toNode) return;

    // Calculate offset for multiple edges between same nodes
    const edgesBetween = visibleEdges.filter(
      (e) =>
        (e.from === edge.from && e.to === edge.to) ||
        (e.from === edge.to && e.to === edge.from),
    );
    const edgeIndex = edgesBetween.indexOf(edge);
    const offset = (edgeIndex - (edgesBetween.length - 1) / 2) * 10;

    // Calculate perpendicular offset
    const dx = toNode.x - fromNode.x;
    const dy = toNode.y - fromNode.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const perpX = (-dy / len) * offset;
    const perpY = (dx / len) * offset;

    // Calculate start and end points at edge of node circles
    const startX = fromNode.x + (dx / len) * fromNode.radius + perpX;
    const startY = fromNode.y + (dy / len) * fromNode.radius + perpY;
    const endX = toNode.x - (dx / len) * toNode.radius + perpX;
    const endY = toNode.y - (dy / len) * toNode.radius + perpY;

    // Draw curved line
    const midX = (startX + endX) / 2 + perpX * 1.5;
    const midY = (startY + endY) / 2 + perpY * 1.5;

    ctx.beginPath();
    ctx.strokeStyle = edge.color;
    ctx.lineWidth = 2;
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(midX, midY, endX, endY);
    ctx.stroke();

    // Draw arrowhead
    const arrowSize = 8;
    // Get tangent at end of curve (derivative of quadratic bezier at t=1)
    const tangentX = 2 * (endX - midX);
    const tangentY = 2 * (endY - midY);
    const tangentLen = Math.sqrt(tangentX * tangentX + tangentY * tangentY);
    const normTangentX = tangentX / tangentLen;
    const normTangentY = tangentY / tangentLen;

    // Arrow points
    const arrowAngle = Math.PI / 6; // 30 degrees
    const ax1 =
      endX -
      arrowSize *
        (normTangentX * Math.cos(arrowAngle) -
          normTangentY * Math.sin(arrowAngle));
    const ay1 =
      endY -
      arrowSize *
        (normTangentX * Math.sin(arrowAngle) +
          normTangentY * Math.cos(arrowAngle));
    const ax2 =
      endX -
      arrowSize *
        (normTangentX * Math.cos(-arrowAngle) -
          normTangentY * Math.sin(-arrowAngle));
    const ay2 =
      endY -
      arrowSize *
        (normTangentX * Math.sin(-arrowAngle) +
          normTangentY * Math.cos(-arrowAngle));

    ctx.beginPath();
    ctx.fillStyle = edge.color;
    ctx.moveTo(endX, endY);
    ctx.lineTo(ax1, ay1);
    ctx.lineTo(ax2, ay2);
    ctx.closePath();
    ctx.fill();
  });

  // Draw nodes
  const isDark = document.documentElement.classList.contains('dark');
  nodes.value.forEach((node) => {
    const isHovered = hoveredNode.value?.id === node.id;

    // Node circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
    ctx.fillStyle = isHovered
      ? isDark
        ? '#374151'
        : '#e5e7eb'
      : isDark
        ? '#1f2937'
        : '#f3f4f6';
    ctx.fill();
    ctx.strokeStyle = isHovered ? '#3b82f6' : isDark ? '#4b5563' : '#d1d5db';
    ctx.lineWidth = isHovered ? 3 : 2;
    ctx.stroke();

    // Group number
    ctx.fillStyle = isDark ? '#f9fafb' : '#111827';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`G${node.groupNumber}`, node.x, node.y - 6);

    // Member count
    ctx.fillStyle = isDark ? '#9ca3af' : '#6b7280';
    ctx.font = '10px system-ui, sans-serif';
    ctx.fillText(`${node.members.length} ppl`, node.x, node.y + 8);
  });
}

function handleMouseMove(event: MouseEvent) {
  const canvas = canvasRef.value;
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  // Find hovered node
  const found = nodes.value.find((node) => {
    const dx = node.x - x;
    const dy = node.y - y;
    return Math.sqrt(dx * dx + dy * dy) <= node.radius;
  });

  hoveredNode.value = found || null;
  if (found) {
    tooltipPos.value = { x: found.x, y: found.y - found.radius };
  }
}

let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  draw();

  if (containerRef.value) {
    resizeObserver = new ResizeObserver(() => {
      draw();
    });
    resizeObserver.observe(containerRef.value);
  }
});

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
});

watch(
  () => [props.routes, props.dinnerGroups, props.members],
  () => {
    draw();
  },
  { deep: true },
);
</script>
