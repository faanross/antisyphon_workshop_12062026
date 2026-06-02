<script lang="ts">
  let { graph = { nodes: [], edges: [] } }: {
    graph?: {
    nodes: Array<{ id: string; label: string; type: string }>;
    edges: Array<{ source: string; target: string; label: string }>;
    };
  } = $props();

  let positioned = $derived(graph.nodes.map((node, index) => {
    const angle = (index / Math.max(1, graph.nodes.length)) * Math.PI * 2;
    return {
      ...node,
      x: 260 + Math.cos(angle) * 190,
      y: 210 + Math.sin(angle) * 150,
    };
  }));

  function byId(id: string) {
    return positioned.find((node) => node.id === id);
  }
</script>

<svg viewBox="0 0 520 420" role="img" aria-label="Knowledge graph">
  {#each graph.edges as edge}
    {@const source = byId(edge.source)}
    {@const target = byId(edge.target)}
    {#if source && target}
      <line x1={source.x} y1={source.y} x2={target.x} y2={target.y} />
      <text x={(source.x + target.x) / 2} y={(source.y + target.y) / 2}>{edge.label}</text>
    {/if}
  {/each}
  {#each positioned as node}
    <g>
      <circle cx={node.x} cy={node.y} r="24" class={node.type} />
      <text x={node.x} y={node.y + 42} text-anchor="middle">{node.label}</text>
    </g>
  {/each}
</svg>

<style>
  svg { width: 100%; min-height: 28rem; background: #fff; border: 1px solid #d8dee9; border-radius: 8px; }
  line { stroke: #94a3b8; stroke-width: 1.5; }
  circle { fill: #e0f2fe; stroke: #0369a1; stroke-width: 2; }
  circle.candidate { fill: #fee2e2; stroke: #b91c1c; }
  circle.process { fill: #fef3c7; stroke: #b45309; }
  circle.ip { fill: #dcfce7; stroke: #15803d; }
  text { font-size: 10px; fill: #374151; }
</style>
