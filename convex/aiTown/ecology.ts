// play-sim-town: a Sugarscape and an El Farol bar inside AI Town.
//
//   survival (Sugarscape, Epstein & Axtell 1996): sugar grows on two hills and
//       regrows a little every eco-step. Every step costs energy (metabolism);
//       an agent standing on a sugar tile eats it. Energy <= 0 -> the agent dies.
//   play (El Farol, Arthur 1994): a bar in the central plaza. It gives no energy.
//       It is fun only when lively but not crowded (crowded = more than 60% of
//       living agents inside). Each agent owns a few attendance forecasts, trusts
//       whichever has been most accurate lately, and goes only if it says "not crowded".
//       LLM conversations happen only in the bar.
//
// Two kinds of agent (the ant and the grasshopper of the 9/30 slides):
//   ant          survival-first: goes to the bar only with slack, leaves early when hungry
//   grasshopper  play-first:     goes whenever not short of food, stays until nearly starving
//
// This is the same rule set as play-sim v0 (numpy), moved into a running town.
import { v, ObjectType } from 'convex/values';
import { Point } from '../util/types';
import { Descriptions } from '../../data/characters';
import type { Game } from './game';
import type { Player } from './player';
import type { Agent } from './agent';
import { movePlayer } from './movement';

// ---- knobs ---------------------------------------------------------------
export const ECO_STEP_MS = 1000; // one Sugarscape/El Farol step per second
export const REGROW = 0.02; // sugar regrown per tile per step: THE SCARCITY KNOB
export const MAX_SUGAR = 4;
export const METABOLISM = 0.25; // energy burned per step, wherever the agent is
export const VISION = 6; // tiles an agent can see sugar
export const VISIT_MS = 60_000; // how long a bar visit lasts (travel included)
export const CROWD = 0.6; // El Farol threshold
export const LIVELY = 0.15; // below this the bar is too empty to be fun
export const THRESHOLDS = {
  ant: { enter: 30, leave: 12 },
  grasshopper: { enter: 15, leave: 4 },
};
export const INIT_ENERGY = [15, 35];

// the bar: open plaza in the middle of the "gentle" map (tiles, inclusive-exclusive)
export const BAR = { x: 40, y: 17, w: 8, h: 7 };
// two sugar hills (Sugarscape): centres must be walkable tiles
export const HILLS: Point[] = [
  { x: 12, y: 16 },
  { x: 56, y: 32 },
];
const HILL_SIGMA = 4.5;

export type Kind = 'ant' | 'grasshopper';
const kindByName = new Map<string, Kind>(
  Descriptions.map((d: any) => [d.name, (d.kind ?? 'ant') as Kind]),
);

export const serializedEcology = {
  step: v.number(),
  lastStep: v.number(),
  sugar: v.array(v.number()), // width*height, index x*height+y
  hist: v.array(v.number()), // bar attendance (fraction of living agents) per step
  err: v.array(v.number()), // running error of each forecast in the bank
  lastPred: v.array(v.number()),
  alive: v.object({ ant: v.number(), grasshopper: v.number() }),
  dead: v.object({ ant: v.number(), grasshopper: v.number() }),
  fun: v.boolean(),
  // per-step history for the right-hand panel (last SERIES_LEN steps)
  series: v.optional(
    v.object({
      antAlive: v.array(v.number()),
      ghAlive: v.array(v.number()),
      antPlay: v.array(v.number()), // agents of this kind on a bar visit (play)
      ghPlay: v.array(v.number()),
      att: v.array(v.number()),
    }),
  ),
  // runs: which run this is, when every agent died, and one summary line per finished run
  run: v.optional(v.number()),
  extinctAt: v.optional(v.number()),
  runs: v.optional(
    v.array(
      v.object({
        run: v.number(),
        steps: v.number(),
        antAlive: v.number(),
        antN: v.number(),
        ghAlive: v.number(),
        ghN: v.number(),
        antPlay: v.number(), // share of agent-steps spent playing
        ghPlay: v.number(),
        why: v.string(), // 'reset' | 'extinct'
      }),
    ),
  ),
  // cumulative agent-steps spent playing (on a bar visit) vs surviving (foraging), per kind
  cum: v.optional(
    v.object({
      antPlay: v.number(),
      antSurv: v.number(),
      ghPlay: v.number(),
      ghSurv: v.number(),
    }),
  ),
};
export const SERIES_LEN = 600;
export const AUTO_RESET_MS = 10_000; // when every agent has starved, start a new run after this long
export const MAX_RUNS_KEPT = 20;
export type SerializedEcology = ObjectType<typeof serializedEcology>;

// ---- helpers -------------------------------------------------------------
let capCache: { key: string; cap: number[] } | undefined;
export function capacity(game: { worldMap: Game['worldMap'] }): number[] {
  const { width, height, objectTiles } = game.worldMap;
  const key = `${width}x${height}`;
  if (capCache?.key === key) return capCache.cap;
  const cap = new Array(width * height).fill(0);
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      if (objectTiles.some((l) => l[x][y] !== -1) || inBar({ x, y })) continue;
      const h = Math.max(
        ...HILLS.map((c) =>
          Math.exp(-((x - c.x) ** 2 + (y - c.y) ** 2) / (2 * HILL_SIGMA ** 2)),
        ),
      );
      const s = MAX_SUGAR * h;
      cap[x * height + y] = s < 0.25 ? 0 : s;
    }
  }
  capCache = { key, cap };
  return cap;
}

export function atBar(p: { position: Point; inBarUntil?: number; human?: string }, now: number) {
  // a human plays by being in the bar; an agent by being in the bar on a visit
  if (p.human) return inBar(p.position);
  return p.inBarUntil !== undefined && now < p.inBarUntil && inBar(p.position);
}

export function inBar(p: Point) {
  return p.x >= BAR.x && p.x < BAR.x + BAR.w && p.y >= BAR.y && p.y < BAR.y + BAR.h;
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function kindOf(game: Game, player: Player): Kind {
  if (player.kind) return player.kind;
  const name = game.playerDescriptions.get(player.id)?.name;
  return (name && kindByName.get(name)) || 'ant';
}

// El Farol: eight simple ways to guess the next attendance from its history
const VISIT_STEPS = 20;
function forecastBank(h: number[]) {
  const n = h.length;
  const mean = (k: number) => h.slice(-k).reduce((a, b) => a + b, 0) / Math.min(k, n);
  const sorted = h.slice(-10).sort((a, b) => a - b);
  const last = h[n - 1];
  return [
    last, // same as now
    mean(5), // recent average
    mean(20), // longer average
    h[n - VISIT_STEPS], // same as one visit ago
    h[n - 2 * VISIT_STEPS], // same as two visits ago
    2 * last - h[n - 5], // trend continues
    1 - last, // contrarian
    sorted[Math.floor(sorted.length / 2)], // recent median
  ].map((x) => Math.min(1, Math.max(0, x ?? last)));
}

function myForecast(eco: SerializedEcology, agentId: string) {
  const h = hash(agentId);
  const owns = [h % 8, (h >>> 3) % 8, (h >>> 6) % 8];
  const best = owns.reduce((a, b) => (eco.err[b] < eco.err[a] ? b : a));
  return eco.lastPred[best];
}

function initEcology(game: Game, now: number): SerializedEcology {
  const hist = Array.from({ length: 2 * VISIT_STEPS + 20 }, () => Math.random());
  return {
    step: 0,
    lastStep: now,
    sugar: capacity(game).slice(),
    hist,
    err: new Array(8).fill(0),
    lastPred: forecastBank(hist),
    alive: { ant: 0, grasshopper: 0 },
    dead: { ant: 0, grasshopper: 0 },
    fun: false,
  };
}

// ---- the world step (called from Game.tick) --------------------------------
export function ecoStep(game: Game, now: number) {
  const world = game.world;
  if (!world.ecology) world.ecology = initEcology(game, now);
  const eco = world.ecology;
  // give newcomers their starting energy at once, so they never fall back to AI Town's idle loop
  for (const p of world.players.values()) {
    if (p.energy === undefined && (!p.human || p.kind)) {
      p.energy = INIT_ENERGY[0] + ((hash(p.id) % 1000) / 1000) * (INIT_ENERGY[1] - INIT_ENERGY[0]);
    }
  }
  if (now < eco.lastStep + ECO_STEP_MS) return;
  eco.lastStep = now;
  eco.step += 1;

  const cap = capacity(game);
  const H = game.worldMap.height;
  // everyone with a body: the agents and any human who joined as an ant or a grasshopper
  const agents = [...world.players.values()].filter((p) => !p.human || p.kind);
  const alive = { ant: 0, grasshopper: 0 };

  for (const p of agents) {
    if (p.energy === undefined) continue;
    // eat what is on the tile (Sugarscape rule M, one tile)
    const x = Math.round(p.position.x),
      y = Math.round(p.position.y);
    const i = x * H + y;
    if (eco.sugar[i] > 0) {
      p.energy += eco.sugar[i];
      eco.sugar[i] = 0;
    }
    p.energy -= METABOLISM;
    const kind = kindOf(game, p);
    if (p.energy <= 0) {
      eco.dead[kind] += 1;
      for (const [aid, a] of world.agents) if (a.playerId === p.id) world.agents.delete(aid);
      p.leave(game, now);
      console.log(`☠ ${game.playerDescriptions.get(p.id)?.name} (${kind}${p.human ? ', human' : ''}) starved`);
      continue;
    }
    alive[kind] += 1;
  }
  eco.alive = alive;

  // regrow sugar
  for (let i = 0; i < eco.sugar.length; i++) {
    if (cap[i] > 0) eco.sugar[i] = Math.round(Math.min(cap[i], eco.sugar[i] + REGROW) * 100) / 100;
  }

  // El Farol: attendance, fun, forecast scores
  const living = [...world.players.values()].filter((p) => !p.human || p.kind);
  // attendance counts agents on a bar visit who are inside (not passers-by on their way to the hills)
  const att = living.length ? living.filter((p) => atBar(p, now)).length / living.length : 0;
  eco.fun = att >= LIVELY && att <= CROWD;
  eco.err = eco.err.map((e, k) => 0.9 * e + Math.abs(eco.lastPred[k] - att));
  eco.hist.push(att);
  if (eco.hist.length > 120) eco.hist.splice(0, eco.hist.length - 120);
  eco.lastPred = forecastBank(eco.hist);

  // survival vs play: an agent on a bar visit is playing, everyone else is foraging
  const playing = { ant: 0, grasshopper: 0 };
  for (const p of living) {
    if (p.human ? inBar(p.position) : p.inBarUntil !== undefined && now < p.inBarUntil)
      playing[kindOf(game, p)] += 1;
  }
  const cum = (eco.cum ??= { antPlay: 0, antSurv: 0, ghPlay: 0, ghSurv: 0 });
  cum.antPlay += playing.ant;
  cum.antSurv += alive.ant - playing.ant;
  cum.ghPlay += playing.grasshopper;
  cum.ghSurv += alive.grasshopper - playing.grasshopper;
  const ser = (eco.series ??= { antAlive: [], ghAlive: [], antPlay: [], ghPlay: [], att: [] });
  ser.antAlive.push(alive.ant);
  ser.ghAlive.push(alive.grasshopper);
  ser.antPlay.push(playing.ant);
  ser.ghPlay.push(playing.grasshopper);
  ser.att.push(Math.round(att * 1000) / 1000);
  for (const arr of Object.values(ser)) if (arr.length > SERIES_LEN) arr.splice(0, arr.length - SERIES_LEN);
}

// ---- an agent's choice: forage or go to the bar (called from Agent.tick) ------
// Returns true when the ecology handled the agent this tick (no LLM operation needed).
export function ecoDecide(game: Game, agent: Agent, player: Player, now: number): boolean {
  const eco = game.world.ecology;
  if (!eco || player.energy === undefined) return false;
  const kind = kindOf(game, player);
  const th = THRESHOLDS[kind];
  const visiting = player.inBarUntil !== undefined && now < player.inBarUntil;

  if (player.energy < th.leave) {
    // hunger wins: leave the bar and forage
    delete player.inBarUntil;
    forage(game, player, now);
    return true;
  }
  if (visiting) {
    if (!inBar(player.position) && !player.pathfinding) movePlayer(game, now, player, barSpot());
    // inside the bar: let AI Town do its thing (talk, idle, wander within the bar)
    return !inBar(player.position);
  }
  delete player.inBarUntil;
  if (player.energy >= th.enter && myForecast(eco, agent.id) <= CROWD) {
    player.inBarUntil = now + VISIT_MS;
    movePlayer(game, now, player, barSpot());
    player.activity = { description: 'going to the bar', emoji: '🍺', until: now + 1 };
    return true;
  }
  forage(game, player, now);
  return true;
}

export function barSpot(): Point {
  return {
    x: BAR.x + Math.floor(Math.random() * BAR.w),
    y: BAR.y + 2 + Math.floor(Math.random() * (BAR.h - 2)), // in front of the counter (rows 0-1)
  };
}

function forage(game: Game, player: Player, now: number) {
  if (player.pathfinding) return;
  const eco = game.world.ecology!;
  const H = game.worldMap.height,
    W = game.worldMap.width;
  const px = Math.round(player.position.x),
    py = Math.round(player.position.y);
  const taken = new Set(
    [...game.world.players.values()]
      .filter((p) => p.id !== player.id)
      .map((p) => {
        const d = p.pathfinding?.destination ?? p.position;
        return Math.round(d.x) * H + Math.round(d.y);
      }),
  );
  let best: Point | undefined,
    bestScore = 0.5;
  for (let dx = -VISION; dx <= VISION; dx++) {
    for (let dy = -VISION; dy <= VISION; dy++) {
      const x = px + dx,
        y = py + dy;
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const i = x * H + y;
      if (taken.has(i)) continue;
      const score = eco.sugar[i] - 0.01 * Math.max(Math.abs(dx), Math.abs(dy));
      if (score > bestScore) {
        bestScore = score;
        best = { x, y };
      }
    }
  }
  if (!best) {
    // nothing in sight: walk toward the nearest hill (agents know where sugar grows)
    const hill = HILLS.reduce((a, b) =>
      Math.abs(a.x - px) + Math.abs(a.y - py) <= Math.abs(b.x - px) + Math.abs(b.y - py) ? a : b,
    );
    best = {
      x: hill.x + Math.floor(Math.random() * 5) - 2,
      y: hill.y + Math.floor(Math.random() * 5) - 2,
    };
  }
  if (best.x === px && best.y === py) return;
  movePlayer(game, now, player, best);
}

// ---- runs -----------------------------------------------------------------------
export function runSummary(eco: SerializedEcology, why: string) {
  const c = eco.cum ?? { antPlay: 0, antSurv: 0, ghPlay: 0, ghSurv: 0 };
  const share = (p: number, s: number) => (p + s ? Math.round((p / (p + s)) * 1000) / 1000 : 0);
  return {
    run: eco.run ?? 1,
    steps: eco.step,
    antAlive: eco.alive.ant,
    antN: eco.alive.ant + eco.dead.ant,
    ghAlive: eco.alive.grasshopper,
    ghN: eco.alive.grasshopper + eco.dead.grasshopper,
    antPlay: share(c.antPlay, c.antSurv),
    ghPlay: share(c.ghPlay, c.ghSurv),
    why,
  };
}

// A fresh ecology for the next run, carrying the run history forward.
export function nextRunEcology(game: Game, now: number, prev: SerializedEcology | undefined, why: string) {
  const fresh = initEcology(game, now);
  if (prev) {
    fresh.runs = [...(prev.runs ?? []), runSummary(prev, why)].slice(-MAX_RUNS_KEPT);
    fresh.run = (prev.run ?? 1) + 1;
  } else {
    fresh.run = 1;
  }
  return fresh;
}

// True once every agent (not human) has starved and the grace period is over.
export function shouldAutoReset(game: Game, now: number) {
  const eco = game.world.ecology;
  if (!eco) return false;
  const agentsLeft = [...game.world.players.values()].some((p) => !p.human);
  if (agentsLeft) {
    delete eco.extinctAt;
    return false;
  }
  if (eco.extinctAt === undefined) {
    eco.extinctAt = now;
    return false;
  }
  return now >= eco.extinctAt + AUTO_RESET_MS;
}
