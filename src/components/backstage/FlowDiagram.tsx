import { useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  type Edge,
  type Node,
  Position,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import type { BackstageWorkflow } from "@/types/backstage";

const NODE_W = 200;
const NODE_H = 56;
const GAP_X = 80;
const GAP_Y = 40;

/**
 * Simple horizontal layered layout:
 * - Source nodes (no incoming edges) start at column 0.
 * - Each successor's column = max(source columns) + 1.
 * - Multiple nodes at the same column are stacked vertically.
 */
const layout = (wf: BackstageWorkflow) => {
  const incoming = new Map<string, string[]>();
  const outgoing = new Map<string, string[]>();
  wf.graph.nodes.forEach((n) => {
    incoming.set(n.id, []);
    outgoing.set(n.id, []);
  });
  wf.graph.edges.forEach((e) => {
    incoming.get(e.to)?.push(e.from);
    outgoing.get(e.from)?.push(e.to);
  });

  const col = new Map<string, number>();
  const visit = (id: string, depth: number) => {
    const prev = col.get(id) ?? -1;
    if (depth <= prev) return;
    col.set(id, depth);
    outgoing.get(id)?.forEach((next) => visit(next, depth + 1));
  };
  wf.graph.nodes.forEach((n) => {
    if ((incoming.get(n.id) ?? []).length === 0) visit(n.id, 0);
  });
  // Any disconnected nodes default to col 0
  wf.graph.nodes.forEach((n) => {
    if (!col.has(n.id)) col.set(n.id, 0);
  });

  // Group by column
  const columns = new Map<number, string[]>();
  wf.graph.nodes.forEach((n) => {
    const c = col.get(n.id)!;
    if (!columns.has(c)) columns.set(c, []);
    columns.get(c)!.push(n.id);
  });

  const nodes: Node[] = wf.graph.nodes.map((n) => {
    const c = col.get(n.id)!;
    const idxInCol = columns.get(c)!.indexOf(n.id);
    const colCount = columns.get(c)!.length;
    const totalH = colCount * NODE_H + (colCount - 1) * GAP_Y;
    return {
      id: n.id,
      data: { label: n.label },
      position: {
        x: c * (NODE_W + GAP_X),
        y: idxInCol * (NODE_H + GAP_Y) - totalH / 2,
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      style: {
        width: NODE_W,
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid hsl(var(--border))",
        background: "hsl(var(--card))",
        color: "hsl(var(--foreground))",
        fontSize: 13,
        fontWeight: 500,
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
      },
    };
  });

  const edges: Edge[] = wf.graph.edges.map((e, idx) => ({
    id: `e-${idx}-${e.from}-${e.to}`,
    source: e.from,
    target: e.to,
    type: "smoothstep",
    animated: true,
    style: { stroke: "hsl(var(--secondary))", strokeWidth: 1.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(var(--secondary))" },
  }));

  return { nodes, edges };
};

export const FlowDiagram = ({ workflow }: { workflow: BackstageWorkflow }) => {
  const { nodes, edges } = useMemo(() => layout(workflow), [workflow]);

  return (
    <div className="h-[420px] w-full overflow-hidden rounded-xl border border-border bg-muted/30">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        zoomOnScroll={false}
        panOnScroll
      >
        <Background gap={16} size={1} color="hsl(var(--border))" />
        <Controls showInteractive={false} className="!shadow-sm" />
      </ReactFlow>
    </div>
  );
};
