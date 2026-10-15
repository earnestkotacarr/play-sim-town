// play-sim-town: joining the town as an ant or a grasshopper.
//   Onboarding — welcome -> pick a kind -> pick a character and name -> mini tutorial -> join
//   YouCard    — while you play: your energy, what to do next, leave; "you starved" afterwards
import { useEffect, useRef, useState } from 'react';
import { useConvex, useMutation } from 'convex/react';
import { ConvexError } from 'convex/values';
import { toast } from 'react-toastify';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { characters } from '../../data/characters';
import { ServerGame } from '../hooks/serverGame.ts';
import { waitForInput } from '../hooks/sendInput.ts';
import { humanToken, markOnboarded, seenOnboarding } from '../hooks/humanToken.ts';
import { CROWD, LIVELY, METABOLISM, THRESHOLDS, inBar } from '../../convex/aiTown/ecology.ts';
import { setLang, useLang, useT } from '../i18n.ts';

type Kind = 'ant' | 'grasshopper';
const C = {
  surface: '#1a1a19',
  raised: '#262624',
  line: '#383835',
  ink: '#ecebe7',
  ink2: '#a9a8a3',
  muted: '#7d7c78',
  ant: '#3987e5',
  gh: '#d95926',
};
const kindColor = (k: Kind) => (k === 'ant' ? C.ant : C.gh);

export function Portrait({ character, size = 64 }: { character: string; size?: number }) {
  const c = characters.find((c) => c.name === character) ?? characters[0];
  const f = (c.spritesheetData.frames as any).down.frame as { x: number; y: number };
  const s = size / 32;
  return (
    <div
      style={{
        width: size,
        height: size,
        backgroundImage: `url(${c.textureUrl})`,
        backgroundPosition: `-${f.x * s}px -${f.y * s}px`,
        backgroundSize: `${384 * s}px ${256 * s}px`,
        imageRendering: 'pixelated',
      }}
    />
  );
}

function Shell({ children, onClose }: { children: any; onClose?: () => void }) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 p-4">
      <div
        className="relative w-full max-w-xl rounded-lg p-6 font-sans"
        style={{ background: C.surface, color: C.ink, border: `1px solid ${C.line}` }}
      >
        {onClose && (
          <button
            className="absolute top-3 right-4 text-xl"
            style={{ color: C.muted }}
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        )}
        {children}
      </div>
    </div>
  );
}

function Steps({ at }: { at: number }) {
  const T = useT();
  return (
    <div className="flex gap-1 mb-4">
      {T.steps.map((s, i) => (
        <div key={s} className="flex-1">
          <div className="h-1 rounded" style={{ background: i <= at ? C.ink : C.line }} />
          <div className="text-[10px] mt-1" style={{ color: i === at ? C.ink : C.muted }}>
            {s}
          </div>
        </div>
      ))}
    </div>
  );
}

function Btn({ children, onClick, primary, disabled }: any) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded px-4 py-2 text-sm font-bold disabled:opacity-40"
      style={
        primary
          ? { background: C.ink, color: C.surface }
          : { background: 'transparent', color: C.ink2, border: `1px solid ${C.line}` }
      }
    >
      {children}
    </button>
  );
}

export function Onboarding({
  worldId,
  open,
  setOpen,
}: {
  worldId: Id<'worlds'>;
  open: boolean;
  setOpen: (o: boolean) => void;
}) {
  const [step, setStep] = useState(0);
  const [kind, setKind] = useState<Kind>('grasshopper');
  const [character, setCharacter] = useState('f1');
  const [name, setName] = useState('');
  const [joining, setJoining] = useState(false);
  const join = useMutation(api.world.joinWorld);
  const convex = useConvex();
  const T = useT();
  const lo = LIVELY * 100,
    hi = CROWD * 100;

  if (!open) return null;
  const close = () => {
    markOnboarded();
    setOpen(false);
    setStep(0);
  };
  const enter = async () => {
    setJoining(true);
    try {
      const inputId = await join({
        worldId,
        name: name.trim() || T.namePlaceholder,
        character,
        kind,
        tokenIdentifier: humanToken(),
      });
      await waitForInput(convex, inputId);
      close();
    } catch (e: any) {
      toast.error(e instanceof ConvexError ? String(e.data) : e.message);
    } finally {
      setJoining(false);
    }
  };

  if (step === 0)
    return (
      <Shell onClose={close}>
        <Steps at={0} />
        <h2 className="text-2xl font-bold mb-2">{T.welcomeTitle}</h2>
        <p className="text-sm mb-3" style={{ color: C.ink2 }}>
          {T.welcomeIntro}
        </p>
        <ul className="text-sm space-y-2 mb-5" style={{ color: C.ink2 }}>
          <li>
            🍯 <b style={{ color: C.ink }}>{T.welcomeSurvival[0]}</b> {T.welcomeSurvival[1]}
          </li>
          <li>
            🍺 <b style={{ color: C.ink }}>{T.welcomePlay(lo, hi)[0]}</b> {T.welcomePlay(lo, hi)[1]}
          </li>
          <li>
            📈 <b style={{ color: C.ink }}>{T.welcomePanel[0]}</b> {T.welcomePanel[1]}
          </li>
        </ul>
        <div className="flex justify-between">
          <Btn onClick={close}>{T.justWatch}</Btn>
          <Btn primary onClick={() => setStep(1)}>
            {T.joinTown}
          </Btn>
        </div>
      </Shell>
    );

  if (step === 1)
    return (
      <Shell onClose={close}>
        <Steps at={1} />
        <h2 className="text-2xl font-bold mb-3">{T.whichAreYou}</h2>
        <div className="grid grid-cols-2 gap-3 mb-5">
          {(
            [
              ['ant', ...T.antCard],
              ['grasshopper', ...T.ghCard],
            ] as [Kind, string, string, string][]
          ).map(([k, title, line, more]) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className="text-left rounded p-3"
              style={{
                background: C.raised,
                border: `2px solid ${kind === k ? kindColor(k) : C.line}`,
              }}
            >
              <div className="text-lg font-bold">{title}</div>
              <div className="text-sm" style={{ color: C.ink }}>
                {line}
              </div>
              <div className="text-xs mt-1" style={{ color: C.muted }}>
                {more} {T.youDecide}
              </div>
            </button>
          ))}
        </div>
        <div className="flex justify-between">
          <Btn onClick={() => setStep(0)}>{T.back}</Btn>
          <Btn primary onClick={() => setStep(2)}>
            {T.next}
          </Btn>
        </div>
      </Shell>
    );

  if (step === 2)
    return (
      <Shell onClose={close}>
        <Steps at={2} />
        <h2 className="text-2xl font-bold mb-3">{T.pickCharacter}</h2>
        <div className="grid grid-cols-4 gap-2 mb-4">
          {characters.map((c) => (
            <button
              key={c.name}
              onClick={() => setCharacter(c.name)}
              className="flex justify-center rounded p-2"
              style={{
                background: C.raised,
                border: `2px solid ${character === c.name ? kindColor(kind) : C.line}`,
              }}
              aria-label={`Character ${c.name}`}
            >
              <Portrait character={c.name} />
            </button>
          ))}
        </div>
        <label className="text-sm" style={{ color: C.ink2 }}>
          {T.yourName}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm" style={{ color: C.muted }}>
              {kind === 'ant' ? 'Ant' : 'Grasshopper'}
            </span>
            <input
              value={name}
              maxLength={24}
              onChange={(e) => setName(e.target.value)}
              placeholder={T.namePlaceholder}
              className="flex-1 rounded px-2 py-1 text-sm"
              style={{ background: C.raised, color: C.ink, border: `1px solid ${C.line}` }}
            />
          </div>
        </label>
        <div className="flex justify-between mt-5">
          <Btn onClick={() => setStep(1)}>{T.back}</Btn>
          <Btn primary onClick={() => setStep(3)}>
            {T.next}
          </Btn>
        </div>
      </Shell>
    );

  return (
    <Shell onClose={close}>
      <Steps at={3} />
      <div className="flex items-center gap-3 mb-3">
        <Portrait character={character} size={48} />
        <h2 className="text-2xl font-bold">
          {T.howToPlay(`${kind === 'ant' ? 'Ant' : 'Grasshopper'} ${name.trim() || T.namePlaceholder}`)}
        </h2>
      </div>
      <ol className="text-sm space-y-2 mb-5 list-decimal pl-5" style={{ color: C.ink2 }}>
        {T.tutorial(METABOLISM, hi, THRESHOLDS[kind].leave, kind).map(([head, body]) => (
          <li key={head}>
            <b style={{ color: C.ink }}>{head}</b> {body}
          </li>
        ))}
      </ol>
      <div className="flex justify-between">
        <Btn onClick={() => setStep(2)}>{T.back}</Btn>
        <Btn primary disabled={joining} onClick={() => void enter()}>
          {joining ? T.joining : T.enterTown}
        </Btn>
      </div>
    </Shell>
  );
}

// the small card over the map while you play
export function YouCard({
  game,
  worldId,
  openOnboarding,
}: {
  game: ServerGame;
  worldId: Id<'worlds'>;
  openOnboarding: () => void;
}) {
  const leave = useMutation(api.world.leaveWorld);
  const T = useT();
  const me = [...game.world.players.values()].find((p) => p.human === humanToken());
  const desc = me ? game.playerDescriptions.get(me.id) : undefined;
  const wasPlaying = useRef(false);
  const [out, setOut] = useState(false);
  useEffect(() => {
    if (me) {
      wasPlaying.current = true;
      setOut(false);
    } else if (wasPlaying.current) {
      wasPlaying.current = false;
      setOut(true);
    }
  }, [!!me]);

  const box = 'absolute top-3 left-3 z-10 w-72 rounded-lg p-3 font-sans text-sm';
  const style = { background: 'rgba(26,26,25,0.92)', color: C.ink, border: `1px solid ${C.line}` };
  if (!me) {
    return out ? (
      <div className={box} style={style}>
        <div className="font-bold mb-1">{T.youOut}</div>
        <div className="text-xs mb-2" style={{ color: C.ink2 }}>
          {T.youOutWhy}
        </div>
        <button className="rounded px-3 py-1 text-xs font-bold" style={{ background: C.ink, color: C.surface }} onClick={openOnboarding}>
          {T.joinAgain}
        </button>
      </div>
    ) : (
      <button
        className="absolute top-3 left-3 z-10 rounded-lg px-4 py-2 font-sans text-sm font-bold"
        style={{ background: C.ink, color: C.surface }}
        onClick={openOnboarding}
      >
        {T.joinButton}
      </button>
    );
  }
  const kind = (me.kind ?? 'ant') as Kind;
  const e = me.energy ?? 0;
  const hungry = e < THRESHOLDS[kind].leave;
  const here = inBar(me.position);
  const tip = hungry
    ? T.tipHungry
    : here
      ? T.tipInBar
      : e >= THRESHOLDS[kind].enter
        ? T.tipRich
        : T.tipForage;
  return (
    <div className={box} style={style}>
      <div className="flex items-center gap-2 mb-2">
        <Portrait character={desc?.character ?? 'f1'} size={40} />
        <div className="flex-1">
          <div className="font-bold leading-tight">{desc?.name}</div>
          <div className="text-xs" style={{ color: C.muted }}>
            {here ? T.atBarPlay : T.foraging}
          </div>
        </div>
        <button
          className="text-xs rounded px-2 py-1"
          style={{ color: C.ink2, border: `1px solid ${C.line}` }}
          onClick={() => void leave({ worldId, tokenIdentifier: humanToken() })}
        >
          {T.leave}
        </button>
      </div>
      <div className="flex justify-between text-xs" style={{ color: C.ink2 }}>
        <span>{T.energy}</span>
        <span>{e.toFixed(1)}</span>
      </div>
      <div className="h-2 w-full rounded mb-2" style={{ background: C.line }}>
        <div
          className="h-2 rounded"
          style={{
            width: `${Math.min(100, (e / 50) * 100)}%`,
            background: hungry ? '#d03b3b' : kindColor(kind),
          }}
        />
      </div>
      <div className="text-xs" style={{ color: hungry ? '#f2a0a0' : C.ink2 }}>
        {tip}
      </div>
    </div>
  );
}

export function useOnboardingOpen() {
  return useState(() => !seenOnboarding());
}

// 日本語 / English switch (UI only; the agents still talk in English)
export function LangToggle() {
  const lang = useLang();
  const T = useT();
  return (
    <button
      className="absolute top-3 right-3 z-10 rounded-lg px-3 py-1 font-sans text-xs font-bold"
      style={{ background: 'rgba(26,26,25,0.92)', color: C.ink, border: `1px solid ${C.line}` }}
      onClick={() => setLang(lang === 'en' ? 'ja' : 'en')}
    >
      {T.langToggle}
    </button>
  );
}
