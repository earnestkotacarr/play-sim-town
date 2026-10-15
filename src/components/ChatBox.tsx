// play-sim-town: talking with the agents, right on the map (under the "you" card).
//   invited       -> "X wants to talk with you"  [Accept] [Decline]
//   you invited   -> "Waiting for X to answer…" / "X is coming over…"  [Cancel]
//   talking       -> the last messages, a text box (Enter sends), [Send] [Leave]
//   ended         -> a short notice saying why (X got hungry, starved, left)
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { GameId } from '../../convex/aiTown/ids';
import { THRESHOLDS } from '../../convex/aiTown/ecology.ts';
import { ServerGame } from '../hooks/serverGame.ts';
import { humanToken } from '../hooks/humanToken.ts';
import { useSendInput } from '../hooks/sendInput.ts';
import { toastOnError } from '../toasts.ts';
import { useT } from '../i18n.ts';
import { Portrait } from './Onboarding.tsx';

type Kind = 'ant' | 'grasshopper';
const C = {
  line: '#383835',
  raised: '#262624',
  ink: '#ecebe7',
  ink2: '#a9a8a3',
  muted: '#7d7c78',
  ant: '#3987e5',
  gh: '#d95926',
  invite: '#e0b341',
};
const SHOWN_MESSAGES = 8;
const NOTICE_MS = 12_000;

type Ended = { name: string; why: 'hungry' | 'starved' | 'gone' | 'declined' | 'left'; at: number };

export function ChatBox({
  game,
  worldId,
  engineId,
}: {
  game: ServerGame;
  worldId: Id<'worlds'>;
  engineId: Id<'engines'>;
}) {
  const T = useT();
  const me = [...game.world.players.values()].find((p) => p.human === humanToken());
  const conv = me ? game.world.playerConversation(me) : undefined;
  const otherId = conv && me ? [...conv.participants.keys()].find((id) => id !== me.id) : undefined;
  const other = otherId ? game.world.players.get(otherId) : undefined;
  const otherDesc = otherId ? game.playerDescriptions.get(otherId) : undefined;
  const otherName = otherDesc?.name ?? '…';
  const otherKind: Kind =
    other?.kind ?? (otherDesc?.name.startsWith('Grasshopper') ? 'grasshopper' : 'ant');
  const myStatus = conv && me ? conv.participants.get(me.id)?.status.kind : undefined;
  const otherStatus = conv && otherId ? conv.participants.get(otherId)?.status.kind : undefined;
  const talking = myStatus === 'participating' && otherStatus === 'participating';

  const acceptInvite = useSendInput(engineId, 'acceptInvite');
  const rejectInvite = useSendInput(engineId, 'rejectInvite');
  const leaveConversation = useSendInput(engineId, 'leaveConversation');
  const startTyping = useSendInput(engineId, 'startTyping');
  const writeMessage = useMutation(api.messages.writeMessage);
  const messages = useQuery(
    api.messages.listMessages,
    conv ? { worldId, conversationId: conv.id } : 'skip',
  );

  // remember who we were talking to, so we can say why the conversation ended
  const last = useRef<{
    convId: string;
    otherId: GameId<'players'>;
    name: string;
    kind: Kind;
    human: boolean;
    otherStatus?: string;
    iLeft: boolean;
  }>();
  const [ended, setEnded] = useState<Ended>();
  useEffect(() => {
    if (conv && otherId) {
      if (last.current?.convId !== conv.id) setEnded(undefined);
      last.current = {
        convId: conv.id,
        otherId,
        name: otherName,
        kind: otherKind,
        human: !!other?.human,
        otherStatus,
        iLeft: last.current?.convId === conv.id ? last.current.iLeft : false,
      };
      return;
    }
    const l = last.current;
    last.current = undefined;
    if (!l || l.iLeft || !me) return;
    const o = game.world.players.get(l.otherId);
    const hungry = o?.energy !== undefined && !o.human && o.energy < THRESHOLDS[l.kind].leave;
    // an agent only vanishes by starving; a human may also have left the town
    const why: Ended['why'] = !o
      ? l.human
        ? 'gone'
        : 'starved'
      : hungry
        ? 'hungry'
        : l.otherStatus === 'invited'
          ? 'declined'
          : 'left';
    setEnded({ name: l.name, why, at: Date.now() });
  }, [conv?.id, otherId, otherStatus, otherName]);
  useEffect(() => {
    if (!ended) return;
    const t = setTimeout(() => setEnded(undefined), NOTICE_MS);
    return () => clearTimeout(t);
  }, [ended]);

  // the text box
  const [text, setText] = useState('');
  const inflight = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (talking) inputRef.current?.focus();
  }, [talking]);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages?.length, conv?.isTyping?.playerId]);

  const box = 'rounded-lg p-3 font-sans text-sm pointer-events-auto';
  const style = { background: 'rgba(26,26,25,0.94)', color: C.ink, border: `1px solid ${C.line}` };
  const btn = 'rounded px-3 py-1 text-xs font-bold';

  if (!me) return null;
  if (!conv || !otherId) {
    if (!ended) return null;
    const line =
      ended.why === 'hungry'
        ? T.chatEndedHungry(ended.name)
        : ended.why === 'starved'
          ? T.chatEndedStarved(ended.name)
          : ended.why === 'gone'
            ? T.chatEndedGone(ended.name)
            : ended.why === 'declined'
              ? T.chatEndedDeclined(ended.name)
              : T.chatEnded(ended.name);
    return (
      <div className={box} style={style} role="status" data-testid="chat-notice">
        <div className="flex items-start gap-2">
          <span className="flex-1">{line}</span>
          <button
            className="text-base leading-none"
            style={{ color: C.muted }}
            aria-label={T.close}
            onClick={() => setEnded(undefined)}
          >
            ×
          </button>
        </div>
      </div>
    );
  }

  const markLeft = () => {
    if (last.current) last.current.iLeft = true;
  };
  const onAccept = () =>
    void toastOnError(acceptInvite({ playerId: me.id, conversationId: conv.id }));
  const onReject = () => {
    markLeft();
    void toastOnError(rejectInvite({ playerId: me.id, conversationId: conv.id }));
  };
  const onLeave = () => {
    markLeft();
    void toastOnError(leaveConversation({ playerId: me.id, conversationId: conv.id }));
  };
  const onType = (v: string) => {
    setText(v);
    if (!v || conv.isTyping || inflight.current) return;
    // tell the agent we are typing, so it waits for us (no toast on error)
    inflight.current = true;
    startTyping({ playerId: me.id, conversationId: conv.id, messageUuid: crypto.randomUUID() })
      .catch(() => {})
      .finally(() => (inflight.current = false));
  };
  const onSend = async () => {
    const t = text.trim();
    if (!t) return;
    setText('');
    const mine = conv.isTyping && conv.isTyping.playerId === me.id;
    await toastOnError(
      writeMessage({
        worldId,
        playerId: me.id,
        conversationId: conv.id,
        text: t,
        messageUuid: mine ? conv.isTyping!.messageUuid : crypto.randomUUID(),
      }),
    );
  };

  const typing =
    conv.isTyping &&
    conv.isTyping.playerId === otherId &&
    !messages?.some((m) => m.messageUuid === conv.isTyping!.messageUuid);
  const shown = (messages ?? []).slice(-SHOWN_MESSAGES);
  const invited = myStatus === 'invited';

  return (
    <div
      className={box}
      style={{ ...style, borderColor: invited ? C.invite : C.line }}
      data-testid="chat-box"
    >
      <div className="flex items-center gap-2 mb-2">
        <Portrait character={otherDesc?.character ?? 'f1'} size={36} />
        <div className="flex-1 min-w-0">
          <div className="font-bold leading-tight truncate">{otherName}</div>
          <div className="text-xs" style={{ color: otherKind === 'ant' ? C.ant : C.gh }}>
            {T.whoKind(otherKind, !!other?.human)}
          </div>
        </div>
        {talking && (
          <button
            className={btn}
            style={{ color: C.ink2, border: `1px solid ${C.line}` }}
            onClick={onLeave}
          >
            {T.leaveChat}
          </button>
        )}
      </div>

      {invited && (
        <>
          <div className="mb-2" style={{ color: C.invite }}>
            {T.chatInvitedYou(otherName)}
          </div>
          <div className="flex gap-2">
            <button className={btn} style={{ background: C.ink, color: '#1a1a19' }} onClick={onAccept}>
              {T.accept}
            </button>
            <button
              className={btn}
              style={{ color: C.ink2, border: `1px solid ${C.line}` }}
              onClick={onReject}
            >
              {T.reject}
            </button>
          </div>
        </>
      )}

      {!invited && !talking && (
        <div className="flex items-center gap-2">
          <span className="flex-1 text-xs" style={{ color: C.ink2 }}>
            {otherStatus === 'invited' ? T.chatWaitingAccept(otherName) : T.chatWalkingOver(otherName)}
          </span>
          <button
            className={btn}
            style={{ color: C.ink2, border: `1px solid ${C.line}` }}
            onClick={onLeave}
          >
            {T.cancel}
          </button>
        </div>
      )}

      {talking && (
        <>
          <div
            ref={scrollRef}
            className="max-h-56 overflow-y-auto space-y-1 mb-2 pr-1"
            data-testid="chat-messages"
          >
            {shown.length === 0 && conv.creator === me.id && (
              <div className="text-xs" style={{ color: C.muted }}>
                {T.chatSayHello(otherName)}
              </div>
            )}
            {shown.map((m) => {
              const mine = m.author === me.id;
              return (
                <div key={m._id} className={mine ? 'text-right' : ''}>
                  <div
                    className="inline-block rounded px-2 py-1 text-left leading-snug"
                    style={{
                      background: mine ? '#3a3a37' : C.raised,
                      maxWidth: '92%',
                      overflowWrap: 'anywhere',
                    }}
                  >
                    <span className="text-[10px] block" style={{ color: C.muted }}>
                      {mine ? T.you : otherName}
                    </span>
                    {m.text}
                  </div>
                </div>
              );
            })}
            {typing && (
              <div className="text-xs italic" style={{ color: C.muted }}>
                {T.chatTyping(otherName)}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={text}
              maxLength={400}
              onChange={(e) => onType(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  void onSend();
                } else if (e.key === 'Escape') {
                  inputRef.current?.blur();
                }
              }}
              placeholder={T.chatPlaceholder}
              aria-label={T.chatPlaceholder}
              className="flex-1 min-w-0 rounded px-2 py-1 text-sm"
              style={{ background: C.raised, color: C.ink, border: `1px solid ${C.line}` }}
            />
            <button
              className={btn}
              style={{ background: C.ink, color: '#1a1a19' }}
              disabled={!text.trim()}
              onClick={() => void onSend()}
            >
              {T.send}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
