// play-sim-town: English / 日本語 for the UI we added. The agents talk in English, and answer in
// Japanese when a human writes to them in Japanese.
// The language lives in module state so it reaches both the React DOM tree and the Pixi tree
// (they are separate renderers and do not share React context).
import { useSyncExternalStore } from 'react';

export type Lang = 'en' | 'ja';

function load(): Lang {
  try {
    const v = localStorage.getItem('playsim-lang');
    if (v === 'en' || v === 'ja') return v;
  } catch {
    /* storage blocked: fall through */
  }
  return typeof navigator !== 'undefined' && navigator.language?.startsWith('ja') ? 'ja' : 'en';
}

let lang: Lang = load();
const subs = new Set<() => void>();

export function setLang(l: Lang) {
  lang = l;
  try {
    localStorage.setItem('playsim-lang', l);
  } catch {
    /* fine: the choice lasts for this page load */
  }
  subs.forEach((f) => f());
}

export function useLang(): Lang {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    () => lang,
  );
}

export function useT() {
  return STRINGS[useLang()];
}

type Kind = 'ant' | 'grasshopper';

const en = {
  ant: 'Ant',
  grasshopper: 'Grasshopper',
  ants: 'Ants',
  grasshoppers: 'Grasshoppers',
  kindName: (k: Kind): string => (k === 'ant' ? 'Ant' : 'Grasshopper'),
  langToggle: '日本語',

  // map labels
  barLabel: (n: number, total: number, pct: number, state: 'fun' | 'crowded' | 'empty') =>
    `BAR ${n}/${total} (${pct}%) ${state === 'fun' ? 'fun' : state === 'crowded' ? 'crowded' : 'too empty'}`,
  counts: (step: number, aA: number, aD: number, gA: number, gD: number) =>
    `step ${step}  ants ${aA} alive / ${aD} dead   grasshoppers ${gA} alive / ${gD} dead`,

  // panel
  panelTitle: 'Survival vs play',
  panelSub: (step: number) => `step ${step} · 1 step = 1 s · ants survival-first, grasshoppers play-first`,
  aliveOf: (k: string) => `${k} alive`,
  starved: (n: number) => `${n} starved`,
  alive: 'Alive',
  playingNow: 'Playing now',
  playingNote: 'Share of the living on a bar visit (play). The rest are foraging (survival).',
  attendance: 'Bar attendance',
  attendanceSeries: 'Attendance',
  attendanceNote: (lo: number, hi: number) =>
    `El Farol: fun between ${lo}% and ${hi}% of the living; above ${hi}% it is crowded.`,
  crowdedRef: (hi: number) => `crowded > ${hi}%`,
  timeSpent: 'Time spent, whole run',
  timeSpentNote: 'Agent-steps playing vs surviving, per kind.',
  playSurv: (p: number, s: number) => `play ${p}% · survival ${s}%`,
  atBarLive: 'At the bar, live',
  runN: (n: number) => `Run ${n}`,
  resetRun: 'Reset run',
  resetConfirm: 'Start a new run? Every agent comes back with fresh energy, the sugar grows back and the charts clear. This run is kept as one line below.',
  autoResetIn: (s: number) => `Everyone has starved. New run in ${s}s.`,
  previousRuns: 'Previous runs',
  runsHead: ['run', 'steps', 'ants alive', 'grasshoppers alive', 'play share (ants / grasshoppers)'],
  why: (w: string): string => (w === 'extinct' ? 'all starved' : 'reset'),
  noTalk: 'No conversations yet.',
  secondsAgo: (s: number) => `${s}s ago`,
  stepsAgo: (n: number) => `${n} steps ago`,
  now: 'now',

  // onboarding
  steps: ['Welcome', 'Kind', 'Character', 'How to play'],
  welcomeTitle: 'A town with a harvest and a bar',
  welcomeIntro: 'Two classic models share one map. Thirty AI agents live here: half are ants (survival first), half are grasshoppers (play first).',
  welcomeSurvival: ['Survival: Sugarscape.', 'Sugar grows on two hills (the amber tiles). Everyone burns energy every second. Eat, or starve.'],
  welcomePlay: (lo: number, hi: number) => [
    'Play: the El Farol bar.',
    `The bar gives no food. It is where people talk, and it is only fun when it is ${lo}–${hi}% full. Everyone guesses how busy it will be.`,
  ],
  welcomePanel: ['The panel on the right', 'shows who survives and how much time each kind spends playing.'],
  justWatch: 'Just watch',
  joinTown: 'Join the town →',
  whichAreYou: 'Which are you?',
  antCard: ['🐜 Ant', 'Survival first.', 'The agents go to the bar only with plenty saved, and leave as soon as they get hungry.'],
  ghCard: ['🦗 Grasshopper', 'Play first.', 'The agents go whenever they are not short of food, and stay until they are nearly starving.'],
  youDecide: 'You decide for yourself; your kind is how the others see you and how you are counted.',
  back: '← Back',
  next: 'Next →',
  pickCharacter: 'Pick a character',
  yourName: 'Your name',
  namePlaceholder: 'You',
  howToPlay: (who: string) => `How to play, ${who}`,
  tutorial: (met: number, hi: number, leave: number, kind: Kind) => [
    ['Walk:', 'click anywhere on the map, or use the arrow keys. Drag to pan, scroll to zoom. You start by the bar door, with a ring under your feet.'],
    ['Eat:', `stand on an amber tile and you eat its sugar. You burn ${met} energy every second; the bar over your head shows how much is left.`],
    ['Play:', 'walk into the bar, click someone, then "Start conversation"; a chat box opens at the top left. Agents in the bar may invite you too. You can also call an agent outside the bar, unless it is hungry. Write in English or Japanese.'],
    ['Watch the crowd:', `above ${hi}% full the bar turns red and stops being fun. The agents guess the crowd; you can too.`],
    ["Don't starve:", `at 0 energy you are out, like everyone else. ${kind === 'ant' ? 'An ant' : 'A grasshopper'} agent would leave the bar below ${leave} energy.`],
  ],
  enterTown: 'Enter the town',
  joining: 'Joining…',

  // you card
  youOut: "You're out.",
  youOutWhy: 'You starved, or you left. The town goes on without you.',
  joinAgain: 'Join again',
  joinButton: '🐜 / 🦗 Join the town',
  leave: 'Leave',
  energy: 'Energy',
  atBarPlay: '🍺 at the bar (play)',
  foraging: '🍯 out foraging (survival)',
  tipHungry: 'Hungry! Walk to an amber tile on a hill to eat.',
  tipInBar: 'In the bar. Click someone, then "Start conversation", or wait to be invited.',
  tipRich: "Plenty of energy. A good time for the bar, if it isn't too crowded.",
  tipForage: 'Forage a little: stand on amber tiles to eat.',

  // talking with agents (chat box under the you card, and the details panel)
  startConversation: 'Start conversation',
  waitingForAccept: 'Waiting for an answer…',
  walkingOver: 'Walking over…',
  leaveConversation: 'Leave conversation',
  accept: 'Accept',
  reject: 'Decline',
  cancel: 'Cancel',
  send: 'Send',
  leaveChat: 'Leave',
  close: 'Close',
  you: 'You',
  whoKind: (k: Kind, human: boolean) =>
    `${k === 'ant' ? '🐜 Ant' : '🦗 Grasshopper'} · ${human ? 'human player' : 'AI agent'}`,
  chatInvitedYou: (name: string) => `${name} wants to talk with you.`,
  chatWaitingAccept: (name: string) => `Waiting for ${name} to answer…`,
  chatWalkingOver: (name: string) => `${name} is coming over…`,
  chatSayHello: (name: string) => `Say hello! If you don't, ${name} will start.`,
  chatTyping: (name: string) => `${name} is typing…`,
  chatPlaceholder: 'Type a message, Enter to send',
  chatEndedHungry: (name: string) => `${name} got hungry and left to eat.`,
  chatEndedStarved: (name: string) => `${name} starved.`,
  chatEndedGone: (name: string) => `${name} left the town.`,
  chatEndedDeclined: (name: string) => `${name} can't talk right now.`,
  chatEnded: (name: string) => `${name} left the conversation.`,
  agentHungryNote: (name: string) => `${name} is hungry and will probably go to eat instead of talking.`,
};

const ja: typeof en = {
  ant: 'アリ',
  grasshopper: 'キリギリス',
  ants: 'アリ',
  grasshoppers: 'キリギリス',
  kindName: (k: Kind) => (k === 'ant' ? 'アリ' : 'キリギリス'),
  langToggle: 'English',

  barLabel: (n, total, pct, state) =>
    `バー ${n}/${total}（${pct}%）${state === 'fun' ? '楽しい' : state === 'crowded' ? '混みすぎ' : '空きすぎ'}`,
  counts: (step, aA, aD, gA, gD) =>
    `ステップ ${step}  アリ 生存${aA}・死亡${aD}   キリギリス 生存${gA}・死亡${gD}`,

  panelTitle: '生存と遊び',
  panelSub: (step) => `ステップ ${step}・1ステップ＝1秒・アリは生存優先、キリギリスは遊び優先`,
  aliveOf: (k) => `${k}の生存数`,
  starved: (n) => `${n}体が餓死`,
  alive: '生存数',
  playingNow: 'いま遊んでいる割合',
  playingNote: '生きている者のうち、バーに来ている（遊び）割合。残りは採集中（生存）。',
  attendance: 'バーの混み具合',
  attendanceSeries: '来店率',
  attendanceNote: (lo, hi) =>
    `El Farol：生きている者の${lo}〜${hi}%がいるときだけ楽しい。${hi}%を超えると混みすぎ。`,
  crowdedRef: (hi) => `混みすぎ > ${hi}%`,
  timeSpent: 'これまでの時間の使い方',
  timeSpentNote: '遊び（バー）と生存（採集）に使ったステップ数の割合。種類ごと。',
  playSurv: (p, s) => `遊び ${p}%・生存 ${s}%`,
  atBarLive: 'バーの会話（ライブ）',
  runN: (n) => `第${n}回`,
  resetRun: 'リセット',
  resetConfirm: '新しい回を始めますか？エージェントは全員エネルギーを回復して戻り、砂糖も元に戻り、グラフは消えます。今の回は下の表に1行で残ります。',
  autoResetIn: (s) => `全員が餓死しました。${s}秒後に新しい回が始まります。`,
  previousRuns: 'これまでの回',
  runsHead: ['回', 'ステップ', 'アリ生存', 'キリギリス生存', '遊びの割合（アリ／キリギリス）'],
  why: (w) => (w === 'extinct' ? '全滅' : 'リセット'),
  noTalk: 'まだ会話はありません。',
  secondsAgo: (s) => `${s}秒前`,
  stepsAgo: (n) => `${n}ステップ前`,
  now: 'いま',

  steps: ['ようこそ', '種類', 'キャラクター', '遊び方'],
  welcomeTitle: '畑とバーのある町',
  welcomeIntro: '2つの古典的なモデルを1つのマップに入れました。AI エージェントが30体住んでいます。半分はアリ（生存優先）、半分はキリギリス（遊び優先）です。',
  welcomeSurvival: ['生存：Sugarscape。', '2つの丘に砂糖が育ちます（琥珀色のマス）。誰でも毎秒エネルギーを使います。食べなければ餓死します。'],
  welcomePlay: (lo, hi) => [
    '遊び：El Farol のバー。',
    `バーでは食べ物は得られません。話をする場所で、${lo}〜${hi}%くらいの混み具合のときだけ楽しい。みんな、どのくらい混むかを予想して行くかどうかを決めます。`,
  ],
  welcomePanel: ['右のパネル', 'には、誰が生き残っているか、それぞれがどれだけ遊びに時間を使っているかが出ます。'],
  justWatch: '見るだけ',
  joinTown: '町に入る →',
  whichAreYou: 'どちらになりますか？',
  antCard: ['🐜 アリ', '生存優先。', 'エージェントは、食べ物の蓄えが十分あるときだけバーに行き、お腹が空いたらすぐに出ます。'],
  ghCard: ['🦗 キリギリス', '遊び優先。', 'エージェントは、食べ物に困っていなければバーに行き、飢える寸前まで居続けます。'],
  youDecide: 'どう動くかはあなた次第です。種類は、ほかの者からの見え方と、集計での数え方を決めます。',
  back: '← 戻る',
  next: '次へ →',
  pickCharacter: 'キャラクターを選ぶ',
  yourName: '名前',
  namePlaceholder: 'あなた',
  howToPlay: (who) => `遊び方：${who}`,
  tutorial: (met, hi, leave, kind) => [
    ['歩く：', 'マップをクリックするか、矢印キーで移動します。ドラッグで視点を動かし、スクロールで拡大・縮小。足元に輪がついているのがあなたで、バーの入り口から始まります。'],
    ['食べる：', `琥珀色のマスに立つと、そこの砂糖を食べます。毎秒 ${met} のエネルギーを使います。頭の上のバーが残りのエネルギーです。`],
    ['遊ぶ：', 'バーに入って誰かをクリックし、「話しかける」を押すと、左上にチャット欄が開きます。バーのエージェントから誘われることもあります。お腹がすいていなければ、バーの外のエージェントにも話しかけられます。日本語で書けば日本語で返事が来ます。'],
    ['混み具合を見る：', `${hi}%を超えるとバーは赤くなり、楽しくなくなります。エージェントは混み具合を予想しています。あなたも予想してみてください。`],
    ['飢えないように：', `エネルギーが0になると、ほかの者と同じく退場です。${kind === 'ant' ? 'アリ' : 'キリギリス'}のエージェントは、エネルギーが ${leave} を切るとバーを出ます。`],
  ],
  enterTown: '町に入る',
  joining: '参加中…',

  youOut: '退場しました。',
  youOutWhy: '餓死したか、自分で出ました。町はそのまま続きます。',
  joinAgain: 'もう一度入る',
  joinButton: '🐜 / 🦗 町に入る',
  leave: '出る',
  energy: 'エネルギー',
  atBarPlay: '🍺 バーにいる（遊び）',
  foraging: '🍯 採集中（生存）',
  tipHungry: 'お腹が空いています！丘の琥珀色のマスに行って食べましょう。',
  tipInBar: 'バーの中です。誰かをクリックして「話しかける」を押すか、誘われるのを待ちましょう。',
  tipRich: 'エネルギーは十分です。混みすぎていなければ、バーに行くのにいいタイミングです。',
  tipForage: '少し採集しましょう。琥珀色のマスに立つと食べられます。',

  startConversation: '話しかける',
  waitingForAccept: '返事を待っています…',
  walkingOver: '近づいています…',
  leaveConversation: '会話をやめる',
  accept: '話す',
  reject: '断る',
  cancel: 'やめる',
  send: '送信',
  leaveChat: '会話をやめる',
  close: '閉じる',
  you: 'あなた',
  whoKind: (k, human) => `${k === 'ant' ? '🐜 アリ' : '🦗 キリギリス'}・${human ? '人間のプレイヤー' : 'AI エージェント'}`,
  chatInvitedYou: (name) => `${name}が話しかけてきました。`,
  chatWaitingAccept: (name) => `${name}の返事を待っています…`,
  chatWalkingOver: (name) => `${name}がこちらに来ています…`,
  chatSayHello: (name) => `あいさつしてみましょう。黙っていると${name}から話し始めます。`,
  chatTyping: (name) => `${name}が入力中…`,
  chatPlaceholder: 'メッセージを入力（Enterで送信）',
  chatEndedHungry: (name) => `${name}はお腹がすいて、食べに行きました。`,
  chatEndedStarved: (name) => `${name}は餓死しました。`,
  chatEndedGone: (name) => `${name}は町を出ました。`,
  chatEndedDeclined: (name) => `${name}はいま話せないようです。`,
  chatEnded: (name) => `${name}は会話を抜けました。`,
  agentHungryNote: (name) => `${name}はお腹がすいているので、話すより食べに行くでしょう。`,
};

export const STRINGS = { en, ja };
