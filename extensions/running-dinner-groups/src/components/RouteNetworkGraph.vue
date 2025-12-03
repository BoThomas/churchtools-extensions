<template>
  <Fieldset legend="Connection Overview" toggleable :collapsed="false">
    <p class="text-sm text-surface-500 dark:text-surface-400 mb-4">
      Click a group to highlight its connections, or use the legend to filter by
      meal type.
    </p>
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
        <span class="text-surface-600 dark:text-surface-400">{{
          getMealLabel('starter')
        }}</span>
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
        <span class="text-surface-600 dark:text-surface-400">{{
          getMealLabel('mainCourse')
        }}</span>
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
        <span class="text-surface-600 dark:text-surface-400">{{
          getMealLabel('dessert')
        }}</span>
      </button>
    </div>
    <div ref="containerRef" class="relative w-full" style="height: 400px">
      <canvas
        ref="canvasRef"
        class="absolute inset-0 cursor-pointer"
        @click="handleClick"
      ></canvas>
    </div>
  </Fieldset>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import type { CategoryValue } from '@churchtools-extensions/persistance';
import type { DinnerGroup, Route, GroupMember } from '@/types/models';
import { getMealEmoji, getMealLabel } from '@/types/models';
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
  mealEmoji: string;
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
const selectedNodeId = ref<number | null>(null);

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
      mealEmoji: getMealEmoji(hostedMeal),
      x: 0,
      y: 0,
      radius: 20 + groupMembers.length * 6,
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

    // Determine edge opacity based on connection type
    let opacity = 1;
    if (selectedNodeId.value !== null) {
      // Direct connection (1st class): edge directly connected to selected node
      const isDirectConnection =
        edge.from === selectedNodeId.value || edge.to === selectedNodeId.value;

      if (isDirectConnection) {
        opacity = 1;
      } else {
        // Check for 2nd class connection: groups that meet the selected group as guests at the same host
        // Find all hosts where the selected group is a guest
        const selectedGroupHosts = visibleEdges
          .filter((e) => e.from === selectedNodeId.value)
          .map((e) => e.to);

        // Check if this edge goes to the same host (sibling guests)
        const isSecondClassConnection = selectedGroupHosts.includes(edge.to);

        opacity = isSecondClassConnection ? 0.4 : 0.05;
      }
    }

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
    ctx.globalAlpha = opacity;
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
    ctx.globalAlpha = 1;
  });

  // Draw nodes
  const isDark = document.documentElement.classList.contains('dark');
  nodes.value.forEach((node) => {
    const isSelected = selectedNodeId.value === node.id;

    // Node circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
    ctx.fillStyle = isDark ? '#1f2937' : '#f3f4f6';
    ctx.fill();
    ctx.strokeStyle = isSelected ? '#3b82f6' : isDark ? '#4b5563' : '#d1d5db';
    ctx.lineWidth = isSelected ? 3 : 2;
    ctx.stroke();

    // Calculate vertical positioning based on number of members
    const lineHeight = 12;
    const totalLines = node.members.length + 1; // +1 for header (group + emoji)
    const startY = node.y - ((totalLines - 1) * lineHeight) / 2;

    // Group number with meal emoji
    ctx.fillStyle = isDark ? '#f9fafb' : '#111827';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${node.mealEmoji} G${node.groupNumber}`, node.x, startY);

    // Member names
    ctx.fillStyle = isDark ? '#9ca3af' : '#6b7280';
    ctx.font = '10px system-ui, sans-serif';
    node.members.forEach((member, index) => {
      ctx.fillText(member, node.x, startY + (index + 1) * lineHeight);
    });
  });
}

function handleClick(event: MouseEvent) {
  const canvas = canvasRef.value;
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  // Find clicked node
  const clickedNode = nodes.value.find((node) => {
    const dx = node.x - x;
    const dy = node.y - y;
    return Math.sqrt(dx * dx + dy * dy) <= node.radius;
  });

  // Toggle selection: if clicking same node, deselect; otherwise select new node
  if (clickedNode) {
    selectedNodeId.value =
      selectedNodeId.value === clickedNode.id ? null : clickedNode.id;
  } else {
    selectedNodeId.value = null;
  }

  draw();
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
