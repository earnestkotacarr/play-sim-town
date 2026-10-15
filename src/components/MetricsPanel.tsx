// play-sim-town: the right-hand panel — survival vs play, live.
// Colours: ants = categorical slot 1 (blue), grasshoppers = slot 2 (orange), dark-mode steps
// from the dataviz reference palette; text stays in neutral ink, colour only marks identity.
import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { ServerGame } from '../hooks/serverGame.ts';
import { AUTO_RESET_MS, CROWD, LIVELY } from '../../convex/aiTown/ecology.ts';
import { useSendInput } from '../hooks/sendInput.ts';
import { toastOnError } from '../toasts.ts';
import { useT } from '../i18n.ts';

const C = {
  surface: '#1a1a19',
  grid: '#383835',
  ink: '#ecebe7',
  ink2: '#a9a8a3',
  muted: '#7d7c78',
  ant: '#3987e5',
  gh: '#d95926',
  neutral: '#4a4a46',
};

type Series = { name: string; color: string; values: number[]; dashed?: boolean };

function LineChart({
  series,
  yMax,
  refs = [],
  fmt = (v: number) => String(v),
  height = 110,
}: {
  series: Series[];
  yMax: number;
  refs?: { y: number; label: string }[];
  fmt?: (v: number) => string;
  height?: number;
}) {
  const W = 360,
    H = height,
    pl = 30,
    pr = 8,
    pt = 6,
    pb = 16;
  const n = Math.max(1, ...series.map((s) => s.values.length));
  const x = (i: number) => pl + (n <= 1 ? 0 : (i / (n - 1)) * (W - pl - pr));
  const y = (v: number) => pt + (1 - v / yMax) * (H - pt - pb);
  const [hover, setHover] = useState<number | null>(null);
  const T = useT();
  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((px - pl) / (W - pl - pr)) * (n - 1));
    setHover(i >= 0 && i < n ? i : null);
  };
  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={pl} x2={W - pr} y1={y(f * yMax)} y2={y(f * yMax)} stroke={C.grid} strokeWidth={1} />
            <text x={pl - 4} y={y(f * yMax) + 3} fontSize={9} fill={C.muted} textAnchor="end">
              {fmt(f * yMax)}
            </text>
          </g>
        ))}
        {refs.map((r) => (
          <g key={r.label}>
            <line
              x1={pl}
              x2={W - pr}
              y1={y(r.y)}
              y2={y(r.y)}
              stroke={C.ink2}
              strokeWidth={1}
              strokeDasharray="4 3"
            />
            <text x={W - pr} y={y(r.y) - 3} fontSize={9} fill={C.ink2} textAnchor="end">
              {r.label}
            </text>
          </g>
        ))}
        {series.map((s) => (
          <polyline
            key={s.name}
            fill="none"
            stroke={s.color}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeDasharray={s.dashed ? '5 3' : undefined}
            points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ')}
          />
        ))}
        {hover !== null && (
          <line x1={x(hover)} x2={x(hover)} y1={pt} y2={H - pb} stroke={C.ink2} strokeWidth={1} />
        )}
        {hover !== null &&
          series.map((s) =>
            s.values[hover] !== undefined ? (
              <circle
                key={s.name}
                cx={x(hover)}
                cy={y(s.values[hover])}
                r={4}
                fill={s.color}
                stroke={C.surface}
                strokeWidth={2}
              />
            ) : null,
          )}
        <text x={pl} y={H - 3} fontSize={9} fill={C.muted}>
          {T.stepsAgo(n)}
        </text>
        <text x={W - pr} y={H - 3} fontSize={9} fill={C.muted} textAnchor="end">
          {T.now}
        </text>
      </svg>
      {hover !== null && (
        <div
          className="absolute top-0 pointer-events-none rounded px-2 py-1 text-xs"
          style={{
            left: `${(x(hover) / W) * 100}%`,
            transform: x(hover) > W / 2 ? 'translateX(-105%)' : 'translateX(5%)',
            background: '#262624',
            color: C.ink,
            border: `1px solid ${C.grid}`,
          }}
        >
          <div style={{ color: C.muted }}>{T.stepsAgo(n - 1 - hover)}</div>
          {series.map((s) => (
            <div key={s.name} className="flex items-center gap-1 whitespace-nowrap">
              <span style={{ background: s.color }} className="inline-block w-2 h-2 rounded-full" />
              {s.name}: {fmt(s.values[hover] ?? 0)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Legend({ items }: { items: { name: string; color: string; dashed?: boolean }[] }) {
  return (
    <div className="flex gap-4 text-xs mb-1" style={{ color: C.ink2 }}>
      {items.map((it) => (
        <span key={it.name} className="flex items-center gap-1">
          <svg width="16" height="6">
            <line
              x1="0"
              x2="16"
              y1="3"
              y2="3"
              stroke={it.color}
              strokeWidth={2}
              strokeDasharray={it.dashed ? '5 3' : undefined}
            />
          </svg>
          {it.name}
        </span>
      ))}
    </div>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: any }) {
  return (
    <section className="mb-5">
      <h3 className="text-sm font-bold" style={{ color: C.ink }}>
        {title}
      </h3>
      {note && (
        <p className="text-xs mb-1" style={{ color: C.muted }}>
          {note}
        </p>
      )}
      {children}
    </section>
  );
}

function ShareBar({ label, color, play, surv }: { label: string; color: string; play: number; surv: number }) {
  const T = useT();
  const tot = play + surv;
  const p = tot ? play / tot : 0;
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs" style={{ color: C.ink2 }}>
        <span>{label}</span>
        <span>{T.playSurv(Math.round(p * 100), Math.round((1 - p) * 100))}</span>
      </div>
      <div className="flex h-3 w-full gap-[2px]" title={`${label}: ${play} agent-steps playing, ${surv} foraging`}>
        <div style={{ width: `${p * 100}%`, background: color }} className="rounded-l" />
        <div style={{ width: `${(1 - p) * 100}%`, background: C.neutral }} className="rounded-r" />
      </div>
    </div>
  );
}

export function MetricsPanel({
  game,
  worldId,
  engineId,
}: {
  game: ServerGame;
  worldId: Id<'worlds'>;
  engineId: Id<'engines'>;
}) {
  const reset = useSendInput(engineId, 'resetRun');
  const eco = game.world.ecology;
  const messages = useQuery(api.messages.recent, { worldId, limit: 14 }) ?? [];
  const T = useT();
  const lo = LIVELY * 100,
    hi = CROWD * 100;
  if (!eco) return null;
  const ser = eco.series;
  const nameOf = (id: string) => game.playerDescriptions.get(id as any)?.name ?? id;
  const kindColor = (id: string) => (nameOf(id).startsWith('Grasshopper') ? C.gh : C.ant);
  const antN = eco.alive.ant + eco.dead.ant,
    ghN = eco.alive.grasshopper + eco.dead.grasshopper;
  const share = (play: number[] | undefined, alive: number[] | undefined) =>
    (play ?? []).map((v, i) => (alive && alive[i] ? v / alive[i] : 0));

  return (
    <div className="h-full overflow-y-auto px-4 py-4 text-sm" style={{ background: C.surface, color: C.ink }}>
      <div className="flex items-center gap-2 pr-20">
        <h2 className="text-lg font-bold">{T.panelTitle}</h2>
        <span className="text-xs rounded px-2" style={{ background: '#262624', color: C.ink2 }}>
          {T.runN(eco.run ?? 1)}
        </span>
        <button
          className="ml-auto text-xs rounded px-2 py-1"
          style={{ color: C.ink, border: `1px solid ${C.grid}` }}
          onClick={() => {
            if (window.confirm(T.resetConfirm)) void toastOnError(reset({}));
          }}
        >
          ↺ {T.resetRun}
        </button>
      </div>
      {eco.extinctAt !== undefined && (
        <p className="text-xs rounded px-2 py-1 my-2" style={{ background: '#3a1f1f', color: '#f2a0a0' }}>
          {T.autoResetIn(Math.max(0, Math.ceil((eco.extinctAt + AUTO_RESET_MS - Date.now()) / 1000)))}
        </p>
      )}
      <p className="text-xs mb-3 pr-16" style={{ color: C.muted }}>
        {T.panelSub(eco.step)}
      </p>

      <div className="grid grid-cols-2 gap-2 mb-5">
        {[
          { name: T.ants, color: C.ant, alive: eco.alive.ant, n: antN, dead: eco.dead.ant },
          { name: T.grasshoppers, color: C.gh, alive: eco.alive.grasshopper, n: ghN, dead: eco.dead.grasshopper },
        ].map((k) => (
          <div key={k.name} className="rounded p-2" style={{ background: '#262624' }}>
            <div className="flex items-center gap-1 text-xs" style={{ color: C.ink2 }}>
              <span style={{ background: k.color }} className="inline-block w-2 h-2 rounded-full" />
              {T.aliveOf(k.name)}
            </div>
            <div className="text-2xl font-bold">
              {k.alive}
              <span className="text-sm" style={{ color: C.muted }}>
                /{k.n}
              </span>
            </div>
            <div className="text-xs" style={{ color: C.muted }}>
              {T.starved(k.dead)}
            </div>
          </div>
        ))}
      </div>

      <Section title={T.alive}>
        <Legend items={[{ name: T.ants, color: C.ant }, { name: T.grasshoppers, color: C.gh }]} />
        <LineChart
          yMax={Math.max(antN, ghN, 1)}
          fmt={(v) => String(Math.round(v))}
          series={[
            { name: T.ants, color: C.ant, values: ser?.antAlive ?? [] },
            { name: T.grasshoppers, color: C.gh, values: ser?.ghAlive ?? [] },
          ]}
        />
      </Section>

      <Section title={T.playingNow} note={T.playingNote}>
        <Legend items={[{ name: T.ants, color: C.ant }, { name: T.grasshoppers, color: C.gh }]} />
        <LineChart
          yMax={1}
          fmt={(v) => `${Math.round(v * 100)}%`}
          series={[
            { name: T.ants, color: C.ant, values: share(ser?.antPlay, ser?.antAlive) },
            { name: T.grasshoppers, color: C.gh, values: share(ser?.ghPlay, ser?.ghAlive) },
          ]}
        />
      </Section>

      <Section title={T.attendance} note={T.attendanceNote(lo, hi)}>
        <LineChart
          yMax={1}
          fmt={(v) => `${Math.round(v * 100)}%`}
          refs={[{ y: CROWD, label: T.crowdedRef(hi) }]}
          series={[{ name: T.attendanceSeries, color: C.ink2, values: ser?.att ?? [] }]}
        />
      </Section>

      <Section title={T.timeSpent} note={T.timeSpentNote}>
        <ShareBar label={T.ants} color={C.ant} play={eco.cum?.antPlay ?? 0} surv={eco.cum?.antSurv ?? 0} />
        <ShareBar label={T.grasshoppers} color={C.gh} play={eco.cum?.ghPlay ?? 0} surv={eco.cum?.ghSurv ?? 0} />
      </Section>

      {(eco.runs?.length ?? 0) > 0 && (
        <Section title={T.previousRuns}>
          <table className="w-full text-xs" style={{ color: C.ink2 }}>
            <thead>
              <tr style={{ color: C.muted }} className="text-left">
                {T.runsHead.map((h) => (
                  <th key={h} className="font-normal pr-2">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...(eco.runs ?? [])].reverse().map((r) => (
                <tr key={r.run}>
                  <td className="pr-2">
                    {r.run} <span style={{ color: C.muted }}>({T.why(r.why)})</span>
                  </td>
                  <td className="pr-2">{r.steps}</td>
                  <td className="pr-2">
                    {r.antAlive}/{r.antN}
                  </td>
                  <td className="pr-2">
                    {r.ghAlive}/{r.ghN}
                  </td>
                  <td>
                    {Math.round(r.antPlay * 100)}% / {Math.round(r.ghPlay * 100)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      <Section title={T.atBarLive}>
        {messages.length === 0 && (
          <p className="text-xs" style={{ color: C.muted }}>
            {T.noTalk}
          </p>
        )}
        <ul className="space-y-2">
          {messages.map((m) => (
            <li key={m.id} className="text-xs leading-snug">
              <span className="flex items-center gap-1 font-bold" style={{ color: C.ink }}>
                <span style={{ background: kindColor(m.author) }} className="inline-block w-2 h-2 rounded-full" />
                {nameOf(m.author)}
                <span className="font-normal" style={{ color: C.muted }}>
                  {T.secondsAgo(Math.max(0, Math.round((Date.now() - m.at) / 1000)))}
                </span>
              </span>
              <span style={{ color: C.ink2 }}>{m.text}</span>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
