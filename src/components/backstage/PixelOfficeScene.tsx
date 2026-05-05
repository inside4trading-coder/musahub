import { useEffect, useMemo, useRef, useState } from "react";
import { X, Plus, Minus, Volume2, VolumeX } from "lucide-react";

/* ---------- Robot profile mapping (mirrors Control Room) ---------- */
type RobotProfile = { matchIds: string[]; short: string; color: string; zone: string };
const PROFILES: RobotProfile[] = [
  { matchIds: ["r2d2-telegram-router"], short: "R2-D2", color: "#4f98a3", zone: "Telegram Lab" },
  { matchIds: ["3po-charts-agent"], short: "3-PO", color: "#5eb8c5", zone: "Telegram Lab" },
  { matchIds: ["email-campaign-webhook", "email-campaign"], short: "MAILER", color: "#e8af34", zone: "Webhook Factory" },
  { matchIds: ["delivery-enrichment"], short: "SCOUT", color: "#d4971e", zone: "Webhook Factory" },
  { matchIds: ["rss-news-aggregator", "rss-aggregator"], short: "HERALD", color: "#6daa45", zone: "Schedule Observatory" },
  { matchIds: ["schumann-resonance", "schumann"], short: "ΣΚUMANN", color: "#4e9e3a", zone: "Schedule Observatory" },
  { matchIds: ["seo-audit-chat", "seo-audit"], short: "ORACLE", color: "#a86fdf", zone: "Oracle Core" },
];
const findProfile = (id: string) => PROFILES.find((p) => p.matchIds.includes(id));

const TRIGGER_ICONS: Record<string, string> = {
  webhook: "⚡", schedule: "⏰", telegram: "✈", chat: "💬", manual: "🖐",
};

function stateForBehavior(b: "working" | "reading" | "patrol" | "idle"): string {
  if (b === "working") return "processing";
  if (b === "reading") return "typing";
  if (b === "patrol") return "sending";
  return "idle";
}

/* ---------- Detail panel overlay (matches Control Room) ---------- */
function DetailPanel({
  workflow, state, onClose,
}: { workflow: BackstageWorkflow; state: string; onClose: () => void }) {
  const profile = findProfile(workflow.id);
  const c = profile?.color ?? "#4ECDC4";
  return (
    <div
      className="absolute right-4 top-4 z-20 max-h-[calc(100%-2rem)] w-[340px] overflow-y-auto rounded-[14px] p-5 text-white animate-in fade-in slide-in-from-right-4"
      style={{
        background: "rgba(7,8,13,0.88)",
        backdropFilter: "blur(20px)",
        border: `1px solid ${c}44`,
        boxShadow: `0 0 40px ${c}22, 0 8px 32px rgba(0,0,0,0.6)`,
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">
            {workflow.id}
          </div>
          <h3 className="text-lg font-bold leading-tight" style={{ color: c }}>
            {profile?.short ?? workflow.name}
          </h3>
          <p className="text-xs text-white/70">{workflow.name}</p>
        </div>
        <button onClick={onClose} className="rounded-md p-1 text-white/60 hover:bg-white/10 hover:text-white">
          ✕
        </button>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span
          className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
          style={{ color: c, borderColor: `${c}66`, background: `${c}14` }}
        >
          {TRIGGER_ICONS[workflow.triggers[0]] ?? "⚡"} {workflow.triggers[0]}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-white/80">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: c }} />
          {state}
        </span>
        {profile?.zone && (
          <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-white/60">
            {profile.zone}
          </span>
        )}
      </div>

      {workflow.description && (
        <p className="mb-4 text-xs leading-relaxed text-white/80">{workflow.description}</p>
      )}

      <div className="mb-4">
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/50">
          Integraciones
        </p>
        <div className="flex flex-wrap gap-1.5">
          {workflow.integrations.map((i) => (
            <span key={i} className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-white/85">
              {i}
            </span>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/50">
          Pasos
        </p>
        <ol className="space-y-1">
          {workflow.graph.nodes.map((n, idx) => (
            <li key={n.id} className="flex items-center gap-2 rounded-md border border-white/5 bg-white/[0.03] px-2 py-1 text-xs text-white/85">
              <span className="text-[10px] text-white/40">{idx + 1}</span>
              <span>{n.label}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

import { OfficeState } from "@/lib/pixel-office/office/engine/officeState";
import { startGameLoop } from "@/lib/pixel-office/office/engine/gameLoop";
import { renderFrame } from "@/lib/pixel-office/office/engine/renderer";
import { TILE_SIZE } from "@/lib/pixel-office/office/types";
import { ZOOM_MIN, ZOOM_MAX } from "@/lib/pixel-office/constants";
import type { BackstageWorkflow } from "@/types/backstage";

interface Props {
  workflows: BackstageWorkflow[];
  onExit: () => void;
  onSelectWorkflow: (wf: BackstageWorkflow) => void;
  generatedAt?: string;
}

// Trigger → behavior mapping
type Behavior = "working" | "reading" | "patrol" | "idle";
function behaviorFor(triggers: string[]): Behavior {
  const t = triggers[0];
  if (t === "webhook") return "working";
  if (t === "schedule") return "reading";
  if (t === "telegram") return "patrol";
  if (t === "chat" || t === "manual") return "idle";
  return "working";
}

// Stable workflow.id → numeric agent id
function agentIdFor(wfId: string, index: number): number {
  let h = 0;
  for (let i = 0; i < wfId.length; i++) h = ((h << 5) - h + wfId.charCodeAt(i)) | 0;
  return Math.abs(h) % 100000 + index * 100000 + 1;
}

// Palette index per known workflow id (0..5)
const PALETTE_BY_ID: Record<string, number> = {
  "r2d2-telegram-router": 0,
  "3po-charts-agent": 1,
  "email-campaign-webhook": 2,
  "delivery-enrichment": 3,
  "rss-news-aggregator": 4,
  "schumann-resonance": 5,
  "seo-audit-chat": 0,
};

// Tiny chime via WebAudio (replaces upstream notificationSound)
function playChime(ctx: AudioContext, vol = 0.1) {
  const notes = [659.25, 1318.51];
  notes.forEach((freq, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "square";
    o.frequency.value = freq;
    g.gain.value = 0;
    o.connect(g).connect(ctx.destination);
    const t0 = ctx.currentTime + i * 0.1;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.01);
    g.gain.linearRampToValueAtTime(0, t0 + 0.18);
    o.start(t0);
    o.stop(t0 + 0.2);
  });
}

export const PixelOfficeScene = ({ workflows, onExit, onSelectWorkflow, generatedAt }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const officeRef = useRef<OfficeState | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastBehaviorRef = useRef<Map<number, Behavior>>(new Map());
  const idMapRef = useRef<Map<number, BackstageWorkflow>>(new Map());

  const [zoom, setZoom] = useState(3);
  const [soundOn, setSoundOn] = useState(true);
  const [now, setNow] = useState(() => new Date());
  const [selected, setSelected] = useState<BackstageWorkflow | null>(null);
  const [selectedBehavior, setSelectedBehavior] = useState<Behavior>("idle");

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Build state once
  useMemo(() => {
    if (!officeRef.current) {
      officeRef.current = new OfficeState();
    }
  }, []);

  // Sync workflows → agents
  useEffect(() => {
    const office = officeRef.current;
    if (!office) return;

    const wantedIds = new Set<number>();
    const map = idMapRef.current;
    map.clear();

    workflows.forEach((wf, idx) => {
      const id = agentIdFor(wf.id, idx);
      wantedIds.add(id);
      map.set(id, wf);

      const behavior = behaviorFor(wf.triggers);
      const palette = PALETTE_BY_ID[wf.id] ?? idx % 6;
      const hueShift = wf.id === "seo-audit-chat" ? 60 : 0;

      // Add if missing
      if (!office.getCharacters().find((c) => c.id === id)) {
        office.addAgent(id, palette, hueShift);
      }

      // Apply behavior
      const prev = lastBehaviorRef.current.get(id);
      if (prev !== behavior) {
        switch (behavior) {
          case "working":
            office.setAgentTool(id, null);
            office.setAgentActive(id, true);
            break;
          case "reading":
            office.setAgentTool(id, "Read");
            office.setAgentActive(id, true);
            break;
          case "patrol":
            office.setAgentTool(id, null);
            office.setAgentActive(id, false);
            break;
          case "idle":
            office.setAgentTool(id, null);
            office.setAgentActive(id, true); // seated, not roaming
            break;
        }
        lastBehaviorRef.current.set(id, behavior);

        // Heartbeat chime when (re)activated
        if (soundOn && audioCtxRef.current && prev !== undefined) {
          try { playChime(audioCtxRef.current, 0.06); } catch { /* noop */ }
        }
      }
    });

    // Remove agents that disappeared
    for (const ch of office.getCharacters()) {
      if (!wantedIds.has(ch.id) && !ch.isSubagent) {
        office.removeAgent(ch.id);
        lastBehaviorRef.current.delete(ch.id);
      }
    }
  }, [workflows, soundOn]);

  // Game loop + canvas sizing
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const office = officeRef.current;
    if (!canvas || !container || !office) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    const stop = startGameLoop(canvas, {
      update: (dt) => office.update(dt),
      render: (ctx) => {
        const layout = office.getLayout();
        renderFrame(
          ctx,
          canvas.width,
          canvas.height,
          office.tileMap,
          office.furniture,
          office.getCharacters(),
          zoom,
          0,
          0,
          {
            selectedAgentId: office.selectedAgentId,
            hoveredAgentId: office.hoveredAgentId,
            hoveredTile: office.hoveredTile,
            seats: office.seats,
            characters: office.characters,
          },
          undefined,
          office.layout.tileColors,
          layout.cols,
          layout.rows,
        );
      },
    });

    return () => {
      stop();
      ro.disconnect();
    };
  }, [zoom]);

  // Click-to-select
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const office = officeRef.current;
    if (!canvas || !office) return;

    // Init audio on first interaction
    if (!audioCtxRef.current && typeof window !== "undefined") {
      try {
        const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
        audioCtxRef.current = new Ctx();
      } catch { /* noop */ }
    }

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const px = (e.clientX - rect.left) * dpr;
    const py = (e.clientY - rect.top) * dpr;
    const layout = office.getLayout();
    const mapW = layout.cols * TILE_SIZE * zoom;
    const mapH = layout.rows * TILE_SIZE * zoom;
    const offsetX = Math.floor((canvas.width - mapW) / 2);
    const offsetY = Math.floor((canvas.height - mapH) / 2);
    const worldX = (px - offsetX) / zoom;
    const worldY = (py - offsetY) / zoom;
    const id = office.getCharacterAt(worldX, worldY);
    if (id !== null) {
      office.selectedAgentId = id;
      const wf = idMapRef.current.get(id);
      if (wf) {
        setSelected(wf);
        setSelectedBehavior(behaviorFor(wf.triggers));
      }
    } else {
      setSelected(null);
    }
  };

  // Notify parent only on detail "expand" (optional secondary action handled via close = local)
  void onSelectWorkflow;

  const timestamp = now.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const agentCount = workflows.length;

  return (
    <div
      ref={containerRef}
      className="relative h-[78vh] w-full overflow-hidden rounded-2xl border border-border bg-[#1a1a2e]"
      style={{ fontFamily: "'Press Start 2P', ui-monospace, monospace" }}
    >
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        className="h-full w-full cursor-pointer"
        style={{ imageRendering: "pixelated" }}
      />

      {/* HUD: top-left */}
      <div className="pointer-events-none absolute left-3 top-3 select-none">
        <div className="rounded-md border border-white/10 bg-black/60 px-3 py-1.5 text-[10px] tracking-wider text-emerald-300 shadow-lg backdrop-blur-sm">
          MUSA OFFICE
        </div>
        {generatedAt && (
          <div className="mt-1 text-[8px] text-white/50">{new Date(generatedAt).toLocaleDateString("es-ES")}</div>
        )}
      </div>

      {/* HUD: top-right (agent count + zoom + exit) */}
      <div className="absolute right-3 top-3 flex items-center gap-2 select-none">
        <div className="rounded-md border border-white/10 bg-black/60 px-3 py-1.5 text-[10px] tracking-wider text-cyan-300 backdrop-blur-sm">
          {agentCount} AGENTS
        </div>
        <div className="flex items-center gap-1 rounded-md border border-white/10 bg-black/60 p-1 backdrop-blur-sm">
          <button
            onClick={() => setZoom((z) => Math.max(ZOOM_MIN, z - 1))}
            className="rounded px-1.5 py-1 text-white/80 transition hover:bg-white/10"
            aria-label="Zoom out"
          >
            <Minus className="h-3 w-3" />
          </button>
          <span className="px-1 text-[9px] text-white/70">{zoom}×</span>
          <button
            onClick={() => setZoom((z) => Math.min(ZOOM_MAX, z + 1))}
            className="rounded px-1.5 py-1 text-white/80 transition hover:bg-white/10"
            aria-label="Zoom in"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
        <button
          onClick={onExit}
          className="rounded-md border border-white/10 bg-black/60 p-1.5 text-white/80 transition hover:bg-white/10"
          aria-label="Exit"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      {/* HUD: bottom-center (timestamp + sound) */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 select-none">
        <div className="flex items-center gap-3 rounded-md border border-white/10 bg-black/60 px-3 py-1.5 text-[9px] tracking-wider text-white/80 backdrop-blur-sm">
          <span>{timestamp}</span>
          <span className="text-white/30">|</span>
          <button
            onClick={() => setSoundOn((s) => !s)}
            className="flex items-center gap-1 transition hover:text-white"
          >
            {soundOn ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
            <span>SOUND {soundOn ? "ON" : "OFF"}</span>
          </button>
        </div>
      </div>
      {selected && (
        <DetailPanel
          workflow={selected}
          state={stateForBehavior(selectedBehavior)}
          onClose={() => {
            setSelected(null);
            if (officeRef.current) officeRef.current.selectedAgentId = null;
          }}
        />
      )}
    </div>
  );
};

export default PixelOfficeScene;
