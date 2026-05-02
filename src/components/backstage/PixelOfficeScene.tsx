import { useEffect, useRef, useState, useMemo } from "react";
import type { BackstageWorkflow } from "@/types/backstage";

// ============ CONSTANTS ============
const TILE_SIZE = 16;
const GRID_COLS = 20;
const GRID_ROWS = 11;
const FPS = 10;
const WALK_SPEED = 2;
const IDLE_FRAMES = [0, 2];
const WALK_FRAMES = [1, 3];
const FRAME_IDLE_INTERVAL = 20;
const FRAME_WALK_INTERVAL = 6;
const SPAWN_RAIN_DURATION = 1000;
const SPAWN_DELAY_BETWEEN = 200;
const WAITING_TIMEOUT = 7000;

// ============ MAP ============
// 0=floor, 1=wall, 2=desk, 3=chair, 4=bookshelf, 5=plant, 6=watercooler, 7=carpet
const MAP: number[][] = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,1],
  [1,0,2,0,2,0,0,0,0,1,1,0,0,2,0,2,0,0,0,1],
  [1,0,3,0,3,0,0,0,0,1,1,0,0,3,0,3,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,7,0,0,1,1,0,0,0,0,0,4,0,0,1],
  [1,0,2,0,2,0,0,0,0,0,0,0,0,2,0,2,0,0,0,1],
  [1,0,3,0,3,0,0,0,0,0,0,0,0,3,0,3,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,5,0,0,0,0,0,0,0,6,0,0,0,0,0,0,0,0,5,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

// Standing-tile in front of desk (one row below desk row)
const AGENT_DESKS: Record<string, { x: number; y: number }> = {
  "r2d2-telegram-router":   { x: 2,  y: 4 },
  "3po-charts-agent":       { x: 4,  y: 4 },
  "email-campaign-webhook": { x: 13, y: 4 },
  "delivery-enrichment":    { x: 15, y: 4 },
  "rss-news-aggregator":    { x: 2,  y: 8 },
  "schumann-resonance":     { x: 4,  y: 8 },
  "seo-audit-chat":         { x: 13, y: 8 },
};

type Palette = { skin: string; hair: string; shirt: string; pants: string; eyes: string };

const AGENT_PALETTES: Record<string, Palette> = {
  "r2d2-telegram-router":   { skin:'#f0c8a0', hair:'#2a6070', shirt:'#4f98a3', pants:'#1a3a4a', eyes:'#1a1a1a' },
  "3po-charts-agent":       { skin:'#d4a880', hair:'#1a4a5a', shirt:'#5eb8c5', pants:'#1a2a3a', eyes:'#2a1a1a' },
  "email-campaign-webhook": { skin:'#f0c8a0', hair:'#8a5a00', shirt:'#e8af34', pants:'#3a2a00', eyes:'#1a1a1a' },
  "delivery-enrichment":    { skin:'#c8a070', hair:'#6a4000', shirt:'#d4971e', pants:'#2a1a00', eyes:'#1a1a1a' },
  "rss-news-aggregator":    { skin:'#f0c8a0', hair:'#3a6020', shirt:'#6daa45', pants:'#1a3a10', eyes:'#1a1a1a' },
  "schumann-resonance":     { skin:'#d4a880', hair:'#2a5018', shirt:'#4e9e3a', pants:'#152a0c', eyes:'#1a1a1a' },
  "seo-audit-chat":         { skin:'#f0d0b0', hair:'#5a2a90', shirt:'#a86fdf', pants:'#2a1a40', eyes:'#1a1a1a' },
};

const DEFAULT_PALETTE: Palette = { skin:'#f0c8a0', hair:'#444466', shirt:'#888899', pants:'#222244', eyes:'#1a1a1a' };

// ============ SPRITE BUILDERS ============
type Cell = string | null;
type Sprite = Cell[][]; // 16 rows × 8 cols

const FOOT = '#2a1a0e';

function spriteIdleA(c: Palette): Sprite {
  const { skin: s, hair: h, shirt: sh, pants: p, eyes: e } = c;
  const _ = null;
  return [
    [_,_,h,h,h,h,_,_],
    [_,h,h,h,h,h,h,_],
    [_,h,s,s,s,s,h,_],
    [_,_,s,e,s,e,s,_],
    [_,_,s,s,s,s,s,_],
    [_,_,s,s,s,s,s,_],
    [_,sh,sh,sh,sh,sh,sh,_],
    [sh,sh,sh,sh,sh,sh,sh,sh],
    [sh,sh,sh,sh,sh,sh,sh,sh],
    [_,sh,sh,sh,sh,sh,sh,_],
    [_,_,p,p,p,p,_,_],
    [_,_,p,_,_,p,_,_],
    [_,_,p,_,_,p,_,_],
    [_,_,p,_,_,p,_,_],
    [_,FOOT,_,_,_,_,FOOT,_],
    [_,_,_,_,_,_,_,_],
  ];
}

function spriteIdleB(c: Palette): Sprite {
  // blink
  const sp = spriteIdleA(c);
  sp[3] = [null,null,c.skin,c.skin,c.skin,c.skin,c.skin,null];
  return sp;
}

function spriteWalkA(c: Palette): Sprite {
  // left foot forward
  const sp = spriteIdleA(c);
  const p = c.pants;
  sp[11] = [null,null,p,p,null,p,null,null];
  sp[12] = [null,null,null,p,null,p,null,null];
  sp[13] = [null,null,null,p,null,p,null,null];
  sp[14] = [null,null,FOOT,null,null,null,FOOT,null];
  return sp;
}

function spriteWalkB(c: Palette): Sprite {
  // right foot forward
  const sp = spriteIdleA(c);
  const p = c.pants;
  sp[11] = [null,null,p,null,p,p,null,null];
  sp[12] = [null,null,p,null,p,null,null,null];
  sp[13] = [null,null,p,null,p,null,null,null];
  sp[14] = [null,FOOT,null,null,null,FOOT,null,null];
  return sp;
}

function getSpriteFrame(c: Palette, frameIdx: number): Sprite {
  // 0=idleA, 1=walkA, 2=idleB, 3=walkB
  switch (frameIdx) {
    case 0: return spriteIdleA(c);
    case 1: return spriteWalkA(c);
    case 2: return spriteIdleB(c);
    case 3: return spriteWalkB(c);
    default: return spriteIdleA(c);
  }
}

function drawSprite(
  ctx: CanvasRenderingContext2D,
  sprite: Sprite,
  x: number,
  y: number,
  zoom: number,
  flipH: boolean
) {
  ctx.save();
  if (flipH) {
    ctx.translate(x + 8 * zoom, y);
    ctx.scale(-1, 1);
    sprite.forEach((row, ry) => {
      row.forEach((color, cx) => {
        if (!color) return;
        ctx.fillStyle = color;
        ctx.fillRect(cx * zoom, ry * zoom, zoom, zoom);
      });
    });
  } else {
    sprite.forEach((row, ry) => {
      row.forEach((color, cx) => {
        if (!color) return;
        ctx.fillStyle = color;
        ctx.fillRect(x + cx * zoom, y + ry * zoom, zoom, zoom);
      });
    });
  }
  ctx.restore();
}

// ============ TILE BUILDERS (16×16) ============
function emptyTile(): Cell[][] {
  return Array.from({ length: TILE_SIZE }, () => Array<Cell>(TILE_SIZE).fill(null));
}

function buildFloorTile(a: string, b: string): Cell[][] {
  const t = emptyTile();
  for (let y = 0; y < TILE_SIZE; y++) {
    for (let x = 0; x < TILE_SIZE; x++) {
      t[y][x] = ((x + y) % 2 === 0) ? a : b;
    }
  }
  return t;
}

function buildWallTile(base: string, dark: string, light: string): Cell[][] {
  const t = emptyTile();
  for (let y = 0; y < TILE_SIZE; y++) {
    for (let x = 0; x < TILE_SIZE; x++) {
      t[y][x] = base;
    }
  }
  // brick lines
  for (let x = 0; x < TILE_SIZE; x++) { t[5][x] = dark; t[10][x] = dark; t[15][x] = dark; }
  for (let y = 0; y < 5; y++) t[y][8] = dark;
  for (let y = 6; y < 10; y++) t[y][4] = dark;
  for (let y = 6; y < 10; y++) t[y][12] = dark;
  for (let y = 11; y < 15; y++) t[y][8] = dark;
  // highlights
  for (let x = 0; x < TILE_SIZE; x++) t[0][x] = light;
  return t;
}

function buildDeskTile(wood: string, light: string, dark: string): Cell[][] {
  const t = buildFloorTile('#2d2b55', '#252345');
  // desk top (rows 4-9)
  for (let y = 4; y < 10; y++) {
    for (let x = 1; x < 15; x++) {
      t[y][x] = wood;
    }
  }
  // top edge highlight
  for (let x = 1; x < 15; x++) t[4][x] = light;
  // bottom shadow
  for (let x = 1; x < 15; x++) t[9][x] = dark;
  // monitor (rows 0-4)
  for (let y = 0; y < 4; y++) {
    for (let x = 5; x < 11; x++) {
      t[y][x] = '#0a0a1a';
    }
  }
  // screen glow
  for (let x = 6; x < 10; x++) t[1][x] = '#4f98a3';
  for (let x = 6; x < 10; x++) t[2][x] = '#3a7888';
  // desk legs
  for (let y = 10; y < 14; y++) { t[y][2] = dark; t[y][13] = dark; }
  return t;
}

function buildChairTile(seat: string, dark: string): Cell[][] {
  const t = buildFloorTile('#2d2b55', '#252345');
  // backrest
  for (let y = 2; y < 8; y++) {
    for (let x = 4; x < 12; x++) t[y][x] = seat;
  }
  for (let y = 2; y < 8; y++) { t[y][4] = dark; t[y][11] = dark; }
  // seat
  for (let y = 8; y < 12; y++) {
    for (let x = 3; x < 13; x++) t[y][x] = seat;
  }
  for (let x = 3; x < 13; x++) t[11][x] = dark;
  // legs
  for (let y = 12; y < 16; y++) { t[y][4] = dark; t[y][11] = dark; }
  return t;
}

function buildShelfTile(frame: string, wood: string, book: string): Cell[][] {
  const t = emptyTile();
  // background frame
  for (let y = 0; y < TILE_SIZE; y++) for (let x = 0; x < TILE_SIZE; x++) t[y][x] = frame;
  // shelves
  for (let shelfY of [3, 8, 13]) {
    for (let x = 1; x < 15; x++) t[shelfY][x] = wood;
  }
  // books
  const bookColors = ['#a83a3a','#3a8a4a','#3a5aa8','#a87a3a','#7a3aa8'];
  for (let row of [0, 5, 10]) {
    for (let i = 0; i < 7; i++) {
      const c = bookColors[i % bookColors.length];
      for (let by = 0; by < 3; by++) {
        t[row + by][2 + i * 2] = c;
        t[row + by][3 + i * 2] = c;
      }
    }
  }
  return t;
}

function buildPlantTile(potDark: string, leafDark: string, leafLight: string): Cell[][] {
  const t = buildFloorTile('#2d2b55', '#252345');
  // pot
  for (let y = 11; y < 15; y++) for (let x = 5; x < 11; x++) t[y][x] = potDark;
  for (let x = 5; x < 11; x++) t[11][x] = '#5a3a1a';
  // leaves
  const leaves = [
    [4,7],[4,8],[3,6],[3,9],[3,7],[3,8],[2,7],[2,8],
    [5,5],[5,10],[6,4],[6,11],[5,6],[5,9],
    [6,7],[6,8],[7,6],[7,9],[7,7],[7,8],
    [8,7],[8,8],[9,7],[9,8],
    [4,5],[4,10],
  ];
  leaves.forEach(([y,x],i) => {
    t[y][x] = i % 3 === 0 ? leafLight : leafDark;
  });
  return t;
}

function buildCoolerTile(body: string, light: string, water: string): Cell[][] {
  const t = buildFloorTile('#2d2b55', '#252345');
  // bottle
  for (let y = 0; y < 6; y++) for (let x = 5; x < 11; x++) t[y][x] = water;
  for (let y = 0; y < 6; y++) { t[y][5] = light; t[y][10] = light; }
  // body
  for (let y = 6; y < 14; y++) for (let x = 4; x < 12; x++) t[y][x] = body;
  // tap
  t[8][7] = '#1a1a1a'; t[8][8] = '#1a1a1a';
  t[9][7] = '#1a1a1a'; t[9][8] = '#1a1a1a';
  // base
  for (let x = 3; x < 13; x++) t[14][x] = '#1a1a2a';
  return t;
}

function buildCarpetTile(a: string, b: string): Cell[][] {
  const t = emptyTile();
  for (let y = 0; y < TILE_SIZE; y++) {
    for (let x = 0; x < TILE_SIZE; x++) {
      t[y][x] = a;
    }
  }
  // pattern
  for (let y = 2; y < 14; y += 4) {
    for (let x = 2; x < 14; x++) t[y][x] = b;
  }
  for (let x = 2; x < 14; x += 4) {
    for (let y = 2; y < 14; y++) t[y][x] = b;
  }
  return t;
}

const TILE_FLOOR = buildFloorTile('#2d2b55', '#252345');
const TILE_WALL = buildWallTile('#1a1a2e', '#0d0d1e', '#2a2a4e');
const TILE_DESK = buildDeskTile('#4a3a2a', '#6a5a3a', '#2a1a0a');
const TILE_CHAIR = buildChairTile('#3a3a5e', '#2a2a4e');
const TILE_SHELF = buildShelfTile('#3a2a1a', '#5a4a2a', '#8a6a3a');
const TILE_PLANT = buildPlantTile('#1a3a1a', '#2a6a2a', '#5aaa5a');
const TILE_COOLER = buildCoolerTile('#3a5a6a', '#4a7a8a', '#aaddee');
const TILE_CARPET = buildCarpetTile('#252548', '#1e1e3e');

function getTileArray(tileType: number): Cell[][] {
  switch (tileType) {
    case 0: return TILE_FLOOR;
    case 1: return TILE_WALL;
    case 2: return TILE_DESK;
    case 3: return TILE_CHAIR;
    case 4: return TILE_SHELF;
    case 5: return TILE_PLANT;
    case 6: return TILE_COOLER;
    case 7: return TILE_CARPET;
    default: return TILE_FLOOR;
  }
}

function drawTile(ctx: CanvasRenderingContext2D, tile: Cell[][], tx: number, ty: number, zoom: number) {
  tile.forEach((row, ry) => {
    row.forEach((color, cx) => {
      if (!color) return;
      ctx.fillStyle = color;
      ctx.fillRect(tx + cx * zoom, ty + ry * zoom, zoom, zoom);
    });
  });
}

// ============ BFS PATHFINDING ============
function bfs(
  start: { x: number; y: number },
  goal: { x: number; y: number },
  occupied: Set<string>
): { x: number; y: number }[] {
  const passable = (x: number, y: number) => {
    if (y < 0 || y >= GRID_ROWS || x < 0 || x >= GRID_COLS) return false;
    const t = MAP[y][x];
    if (t === 1) return false; // wall
    if (t === 2) return false; // desk
    if (t === 4) return false; // shelf
    if (t === 6) return false; // cooler
    if (occupied.has(`${x},${y}`) && !(x === goal.x && y === goal.y)) return false;
    return true;
  };
  if (!passable(goal.x, goal.y)) return [];
  const key = (p: { x: number; y: number }) => `${p.x},${p.y}`;
  const queue: { pos: { x: number; y: number }; path: { x: number; y: number }[] }[] = [
    { pos: start, path: [] },
  ];
  const visited = new Set<string>([key(start)]);
  const dirs = [{x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:1,y:0}];
  while (queue.length > 0) {
    const { pos, path } = queue.shift()!;
    if (pos.x === goal.x && pos.y === goal.y) return path;
    for (const d of dirs) {
      const nx = pos.x + d.x;
      const ny = pos.y + d.y;
      const k = `${nx},${ny}`;
      if (!visited.has(k) && passable(nx, ny)) {
        visited.add(k);
        queue.push({ pos: { x: nx, y: ny }, path: [...path, { x: nx, y: ny }] });
      }
    }
  }
  return [];
}

// ============ STATE MACHINE ============
type AgentState = 'idle' | 'walking' | 'typing' | 'reading' | 'waiting' | 'processing' | 'sending';

const STATES_BY_TRIGGER: Record<string, AgentState[]> = {
  telegram: ['sending', 'idle', 'walking'],
  webhook: ['typing', 'idle', 'walking'],
  schedule: ['reading', 'processing', 'idle', 'walking'],
  chat: ['waiting', 'typing', 'idle'],
  manual: ['idle', 'walking'],
};

interface DigitalRain {
  col: number;
  drops: number[];
  chars: string[];
  alpha: number;
  done: boolean;
  startTime: number;
}

interface PixelAgent {
  id: string;
  name: string;
  shortName: string;
  trigger: string;
  palette: Palette;
  pos: { x: number; y: number };
  desk: { x: number; y: number };
  state: AgentState;
  path: { x: number; y: number }[];
  animFrame: number;
  frameTimer: number;
  stateTimer: number;
  facingLeft: boolean;
  spawned: boolean;
  spawnRain: DigitalRain | null;
  spawnAt: number;
  waitingTimer: number;
  prevWorkingState: boolean;
}

const RAIN_CHARS = '01アイウエオカキクケコサシスセソタチツテトナニヌネノ';

// ============ COMPONENT ============
interface Props {
  workflows: BackstageWorkflow[];
  onSelectWorkflow?: (wf: BackstageWorkflow) => void;
  onExit: () => void;
  generatedAt?: string;
}

export const PixelOfficeScene = ({ workflows, onSelectWorkflow, onExit, generatedAt }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(3);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const soundEnabledRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => { soundEnabledRef.current = soundEnabled; }, [soundEnabled]);

  // Build agents from workflows
  const agents = useMemo<PixelAgent[]>(() => {
    return workflows.slice(0, 7).map((wf, i) => {
      const desk = AGENT_DESKS[wf.id] ?? { x: 2 + (i % 7) * 2, y: i < 4 ? 4 : 8 };
      const palette = AGENT_PALETTES[wf.id] ?? DEFAULT_PALETTE;
      const trigger = wf.triggers[0] ?? 'manual';
      return {
        id: wf.id,
        name: wf.name,
        shortName: wf.name.split('—')[0]?.trim() || wf.name,
        trigger,
        palette,
        pos: { x: desk.x, y: desk.y },
        desk,
        state: 'idle' as AgentState,
        path: [],
        animFrame: 0,
        frameTimer: 0,
        stateTimer: 30 + Math.floor(Math.random() * 50),
        facingLeft: false,
        spawned: false,
        spawnRain: null,
        spawnAt: i * SPAWN_DELAY_BETWEEN,
        waitingTimer: 0,
        prevWorkingState: false,
      };
    });
  }, [workflows]);

  const agentsRef = useRef(agents);
  useEffect(() => { agentsRef.current = agents; }, [agents]);

  const selectedRef = useRef<string | null>(null);
  useEffect(() => { selectedRef.current = selectedId; }, [selectedId]);

  // Notify parent when selection changes
  useEffect(() => {
    if (!selectedId || !onSelectWorkflow) return;
    const wf = workflows.find(w => w.id === selectedId);
    if (wf) onSelectWorkflow(wf);
  }, [selectedId, workflows, onSelectWorkflow]);

  function playChime() {
    if (!soundEnabledRef.current) return;
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'square';
        osc.frequency.value = freq;
        const start = ctx.currentTime + i * 0.12;
        osc.start(start);
        osc.stop(start + 0.1);
        gain.gain.setValueAtTime(0.15, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.1);
      });
    } catch {}
  }

  function playSelectionBeep() {
    if (!soundEnabledRef.current) return;
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'square';
      osc.frequency.value = 880;
      const t = ctx.currentTime;
      osc.start(t);
      osc.stop(t + 0.06);
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    } catch {}
  }

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let lastTime = 0;
    let frame = 0;
    const startTime = performance.now();

    function transitionState(agent: PixelAgent) {
      const possible = STATES_BY_TRIGGER[agent.trigger] ?? STATES_BY_TRIGGER.manual;
      const wasWorking = agent.state === 'typing' || agent.state === 'processing' || agent.state === 'sending' || agent.state === 'reading';
      let next: AgentState;
      // bias towards work states
      if (Math.random() < 0.6) {
        next = possible[Math.floor(Math.random() * possible.length)];
      } else {
        next = 'walking';
      }
      // chime when leaving a working state into idle
      if (wasWorking && next === 'idle') playChime();

      agent.state = next;
      agent.stateTimer = 25 + Math.floor(Math.random() * 45); // 2.5–7s at 10fps
      agent.frameTimer = 0;

      if (next === 'walking') {
        // wander to a random walkable tile
        const occupied = new Set<string>();
        agentsRef.current.forEach(o => {
          if (o.id !== agent.id && o.spawned) occupied.add(`${Math.round(o.pos.x)},${Math.round(o.pos.y)}`);
        });
        for (let attempt = 0; attempt < 8; attempt++) {
          const tx = 1 + Math.floor(Math.random() * (GRID_COLS - 2));
          const ty = 1 + Math.floor(Math.random() * (GRID_ROWS - 2));
          if (MAP[ty][tx] !== 0 && MAP[ty][tx] !== 7) continue;
          const path = bfs({ x: Math.round(agent.pos.x), y: Math.round(agent.pos.y) }, { x: tx, y: ty }, occupied);
          if (path.length > 0) { agent.path = path; break; }
        }
      } else if (next === 'typing' || next === 'reading' || next === 'processing' || next === 'sending') {
        // go back to desk
        const occupied = new Set<string>();
        agentsRef.current.forEach(o => {
          if (o.id !== agent.id && o.spawned) occupied.add(`${Math.round(o.pos.x)},${Math.round(o.pos.y)}`);
        });
        const path = bfs({ x: Math.round(agent.pos.x), y: Math.round(agent.pos.y) }, agent.desk, occupied);
        agent.path = path;
      } else if (next === 'waiting') {
        agent.waitingTimer = 0;
      }
    }

    function update(now: number) {
      const elapsed = now - startTime;
      agentsRef.current.forEach(agent => {
        // spawn
        if (!agent.spawned) {
          if (elapsed >= agent.spawnAt && !agent.spawnRain) {
            agent.spawnRain = {
              col: agent.desk.x,
              drops: [0, 1, 2],
              chars: [
                RAIN_CHARS[Math.floor(Math.random() * RAIN_CHARS.length)],
                RAIN_CHARS[Math.floor(Math.random() * RAIN_CHARS.length)],
                RAIN_CHARS[Math.floor(Math.random() * RAIN_CHARS.length)],
              ],
              alpha: 1,
              done: false,
              startTime: elapsed,
            };
          }
          if (agent.spawnRain) {
            const rainElapsed = elapsed - agent.spawnRain.startTime;
            agent.spawnRain.drops = agent.spawnRain.drops.map(y => (y + 1) % GRID_ROWS);
            agent.spawnRain.chars = agent.spawnRain.chars.map(
              () => RAIN_CHARS[Math.floor(Math.random() * RAIN_CHARS.length)]
            );
            if (rainElapsed > SPAWN_RAIN_DURATION) {
              agent.spawnRain.alpha = Math.max(0, 1 - (rainElapsed - SPAWN_RAIN_DURATION) / 300);
              if (agent.spawnRain.alpha <= 0) {
                agent.spawnRain.done = true;
                agent.spawned = true;
              }
            }
          }
          return;
        }

        // walk along path
        if (agent.path.length > 0 && frame % WALK_SPEED === 0) {
          const next = agent.path.shift()!;
          agent.facingLeft = next.x < agent.pos.x;
          agent.pos = { x: next.x, y: next.y };
        }

        // state timer
        agent.stateTimer--;
        if (agent.stateTimer <= 0 && agent.path.length === 0) {
          transitionState(agent);
        }

        // sync state with movement
        if (agent.path.length > 0 && agent.state !== 'walking') {
          // agent is moving but state is not walking — temp set to walking visually
        }

        // animation
        agent.frameTimer++;
        const isMoving = agent.path.length > 0;
        const interval = isMoving ? FRAME_WALK_INTERVAL : FRAME_IDLE_INTERVAL;
        if (agent.frameTimer >= interval) {
          agent.frameTimer = 0;
          const frames = isMoving ? WALK_FRAMES : IDLE_FRAMES;
          const idx = frames.indexOf(agent.animFrame);
          agent.animFrame = frames[(idx + 1) % frames.length];
          if (idx === -1) agent.animFrame = frames[0];
        }

        // waiting timer
        if (agent.state === 'waiting') {
          agent.waitingTimer += 100;
        }
      });
    }

    function drawSpeechBubble(agent: PixelAgent, frameN: number) {
      if (agent.state !== 'waiting') return;
      const blink = Math.floor(frameN / 15) % 2 === 0;
      if (!blink) return;
      const ax = agent.pos.x * TILE_SIZE * zoom;
      const ay = agent.pos.y * TILE_SIZE * zoom;
      const bw = 20 * zoom, bh = 12 * zoom;
      const bx = ax - bw * 0.1;
      const by = ay - bh - 4 * zoom;
      ctx!.fillStyle = '#fffde7';
      ctx!.fillRect(bx, by, bw, bh);
      ctx!.strokeStyle = '#ffb300';
      ctx!.lineWidth = zoom;
      ctx!.strokeRect(bx, by, bw, bh);
      ctx!.fillStyle = '#fffde7';
      ctx!.beginPath();
      ctx!.moveTo(bx + bw * 0.3, by + bh);
      ctx!.lineTo(bx + bw * 0.3 + 3 * zoom, by + bh);
      ctx!.lineTo(bx + bw * 0.3 + zoom, by + bh + 4 * zoom);
      ctx!.fill();
      ctx!.stroke();
      ctx!.fillStyle = '#333';
      ctx!.font = `bold ${zoom * 4}px "Press Start 2P", monospace`;
      ctx!.fillText('...', bx + bw * 0.2, by + bh * 0.75);
    }

    function drawRain(rain: DigitalRain) {
      ctx!.font = `bold ${TILE_SIZE * zoom * 0.6}px "Press Start 2P", monospace`;
      rain.drops.forEach((dropY, i) => {
        ctx!.globalAlpha = rain.alpha * (i === rain.drops.length - 1 ? 1 : 0.4);
        ctx!.fillStyle = '#00ff41';
        ctx!.fillText(
          rain.chars[i],
          (rain.col) * TILE_SIZE * zoom + i * 2 * zoom,
          dropY * TILE_SIZE * zoom + TILE_SIZE * zoom
        );
      });
      ctx!.globalAlpha = 1;
    }

    function drawHUD(frameN: number) {
      const W = GRID_COLS * TILE_SIZE * zoom;
      const H = GRID_ROWS * TILE_SIZE * zoom;
      ctx!.fillStyle = 'rgba(10, 10, 20, 0.75)';
      ctx!.fillRect(0, 0, W, TILE_SIZE * zoom);
      ctx!.font = `${zoom * 4}px "Press Start 2P", monospace`;
      ctx!.fillStyle = '#4f98a3';
      ctx!.fillText('MUSA OFFICE', zoom * 4, zoom * 10);
      ctx!.fillStyle = '#6daa45';
      const countText = `${agentsRef.current.length} AGENTS`;
      const cw = ctx!.measureText(countText).width;
      ctx!.fillText(countText, W - cw - zoom * 4, zoom * 10);
      // activity dots
      agentsRef.current.forEach((a, i) => {
        const active = a.state !== 'idle' && a.state !== 'walking';
        ctx!.fillStyle = active ? a.palette.shirt : '#333355';
        if (active && Math.floor(frameN / 8) % 2 === 0) ctx!.fillStyle = '#ffffff';
        ctx!.fillRect(zoom * 4 + i * zoom * 7, H - zoom * 3, zoom * 5, zoom * 2);
      });
    }

    function drawSelection(agent: PixelAgent, frameN: number) {
      if (selectedRef.current !== agent.id) return;
      const ax = agent.pos.x * TILE_SIZE * zoom;
      const ay = agent.pos.y * TILE_SIZE * zoom;
      const pulse = Math.floor(frameN / 4) % 2 === 0;
      ctx!.strokeStyle = pulse ? '#ffffff' : agent.palette.shirt;
      ctx!.lineWidth = zoom;
      ctx!.strokeRect(ax, ay, 8 * zoom, 16 * zoom);
    }

    function render(frameN: number) {
      ctx!.imageSmoothingEnabled = false;
      const W = GRID_COLS * TILE_SIZE * zoom;
      const H = GRID_ROWS * TILE_SIZE * zoom;
      ctx!.fillStyle = '#1a1a2e';
      ctx!.fillRect(0, 0, W, H);

      // z-sort: row by row
      for (let row = 0; row < GRID_ROWS; row++) {
        for (let col = 0; col < GRID_COLS; col++) {
          drawTile(ctx!, getTileArray(MAP[row][col]), col * TILE_SIZE * zoom, row * TILE_SIZE * zoom, zoom);
        }
        agentsRef.current.forEach(a => {
          if (a.spawned && Math.round(a.pos.y) === row) {
            const sprite = getSpriteFrame(a.palette, a.animFrame);
            drawSprite(
              ctx!,
              sprite,
              a.pos.x * TILE_SIZE * zoom,
              a.pos.y * TILE_SIZE * zoom,
              zoom,
              a.facingLeft
            );
            drawSelection(a, frameN);
          }
        });
      }

      // overlays
      agentsRef.current.forEach(a => {
        if (a.spawnRain && !a.spawnRain.done) drawRain(a.spawnRain);
        if (a.spawned) drawSpeechBubble(a, frameN);
      });

      drawHUD(frameN);
    }

    function loop(timestamp: number) {
      raf = requestAnimationFrame(loop);
      if (timestamp - lastTime < 1000 / FPS) return;
      lastTime = timestamp;
      frame++;
      update(timestamp);
      render(frame);
    }

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [zoom]);

  // resize canvas on zoom change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = GRID_COLS * TILE_SIZE * zoom;
    canvas.height = GRID_ROWS * TILE_SIZE * zoom;
  }, [zoom]);

  // click handling
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const px = (e.clientX - rect.left) * scaleX;
    const py = (e.clientY - rect.top) * scaleY;
    const tx = Math.floor(px / (TILE_SIZE * zoom));
    const ty = Math.floor(py / (TILE_SIZE * zoom));
    const hit = agentsRef.current.find(
      a => a.spawned && Math.round(a.pos.x) === tx && Math.round(a.pos.y) === ty
    );
    if (hit) {
      setSelectedId(hit.id);
      playSelectionBeep();
    } else {
      setSelectedId(null);
    }
  };

  const buttonStyle: React.CSSProperties = {
    fontFamily: '"Press Start 2P", monospace',
    fontSize: 10,
    background: '#1a1a2e',
    color: '#4f98a3',
    border: '1px solid #4f98a3',
    padding: '4px 8px',
    cursor: 'pointer',
    lineHeight: '16px',
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
      <div className="relative w-full overflow-hidden rounded-2xl border border-border bg-[#0a0a14]" style={{ minHeight: 480 }}>
        <div className="flex w-full justify-center overflow-auto p-4">
          <canvas
            ref={canvasRef}
            onClick={handleClick}
            style={{
              imageRendering: 'pixelated',
              display: 'block',
              cursor: 'pointer',
              maxWidth: '100%',
            }}
          />
        </div>

        {/* Zoom controls */}
        <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 4, zIndex: 10, alignItems: 'center' }}>
          <button onClick={() => setZoom(z => Math.min(z + 1, 5))} style={buttonStyle}>+</button>
          <span style={{
            fontFamily: '"Press Start 2P", monospace',
            fontSize: 9, color: '#666688', lineHeight: '24px', minWidth: 28, textAlign: 'center',
          }}>{zoom}×</span>
          <button onClick={() => setZoom(z => Math.max(z - 1, 1))} style={buttonStyle}>−</button>
          <button onClick={onExit} style={{ ...buttonStyle, marginLeft: 8, color: '#a86fdf', borderColor: '#a86fdf' }}>EXIT</button>
        </div>

        {/* Bottom toolbar */}
        <div style={{
          position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', gap: 8, alignItems: 'center',
          background: 'rgba(10,10,20,0.85)', border: '1px solid #333355',
          padding: '6px 14px',
          fontFamily: '"Press Start 2P", monospace', fontSize: 8, zIndex: 10,
        }}>
          <span style={{ color: '#555577' }}>
            {generatedAt ? new Date(generatedAt).toLocaleTimeString('es-ES') : new Date().toLocaleTimeString('es-ES')}
          </span>
          <span style={{ color: '#333355' }}>|</span>
          <button
            onClick={() => setSoundEnabled(s => !s)}
            style={{
              background: 'none', border: 'none',
              color: soundEnabled ? '#6daa45' : '#555577',
              cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit',
            }}
          >
            {soundEnabled ? '🔔 SOUND ON' : '🔕 SOUND OFF'}
          </button>
          {selectedId && (
            <>
              <span style={{ color: '#333355' }}>|</span>
              <span style={{ color: '#4f98a3' }}>
                {agentsRef.current.find(a => a.id === selectedId)?.shortName.toUpperCase()}
              </span>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default PixelOfficeScene;
