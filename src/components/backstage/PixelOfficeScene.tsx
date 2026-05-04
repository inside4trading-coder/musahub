import { useEffect, useMemo, useRef, useState } from "react";
import { X, Plus, Minus, Volume2, VolumeX } from "lucide-react";
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
      if (wf) onSelectWorkflow(wf);
    }
  };

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
    </div>
  );
};

export default PixelOfficeScene;
