// play-sim-town: draws the Sugarscape sugar, the El Farol bar, energy bars and the counts.
import { Graphics, Sprite, Text } from '@pixi/react';
import { Graphics as PixiGraphics, SCALE_MODES, TextMetrics, TextStyle, Texture } from 'pixi.js';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import barUrl from '../../assets/bar.png';
import { Fragment, useCallback } from 'react';
import { ServerGame } from '../hooks/serverGame.ts';
import { BAR, CROWD, MAX_SUGAR, THRESHOLDS, atBar } from '../../convex/aiTown/ecology.ts';
import { useT } from '../i18n.ts';

// the El Farol bar: a pixel-art tavern drawn by data/make_bar.py, same scale as the map tiles
const barTexture = Texture.from(barUrl, { scaleMode: SCALE_MODES.NEAREST });

const style = new TextStyle({
  fontFamily: 'monospace',
  fontSize: 22,
  fill: '#ffffff',
  stroke: '#000000',
  strokeThickness: 4,
});

const bubbleStyle = new TextStyle({
  fontFamily: 'sans-serif',
  fontSize: 15,
  fill: '#1a1a19',
  wordWrap: true,
  breakWords: true, // Japanese has no spaces to wrap at
  wordWrapWidth: 240,
  lineHeight: 18,
});
const BUBBLE_MS = 9000;

// speech bubbles: the latest line of each agent who spoke in the last few seconds
export function Bubbles({ game, worldId }: { game: ServerGame; worldId: Id<'worlds'> }) {
  const messages = useQuery(api.messages.recent, { worldId, limit: 20 }) ?? [];
  const { tileDim } = game.worldMap;
  const now = Date.now();
  const seen = new Set<string>();
  const shown = messages.filter((m) => {
    if (now - m.at > BUBBLE_MS || seen.has(m.author)) return false;
    seen.add(m.author);
    return game.world.players.has(m.author as any);
  });
  return (
    <>
      {shown.map((m) => {
        const p = game.world.players.get(m.author as any)!;
        const text = m.text.length > 160 ? m.text.slice(0, 157) + '…' : m.text;
        const tm = TextMetrics.measureText(text, bubbleStyle);
        const w = tm.width + 16,
          h = tm.height + 12;
        const x = p.position.x * tileDim - w / 2,
          y = p.position.y * tileDim - tileDim * 1.6 - h;
        const draw = (g: PixiGraphics) => {
          g.clear();
          g.lineStyle(2, 0x1a1a19, 0.8);
          g.beginFill(0xffffff, 0.95);
          g.drawRoundedRect(x, y, w, h, 8);
          g.endFill();
          g.beginFill(0xffffff, 0.95);
          g.drawPolygon([x + w / 2 - 6, y + h - 1, x + w / 2 + 6, y + h - 1, x + w / 2, y + h + 8]);
          g.endFill();
        };
        return (
          <Fragment key={m.id}>
            <Graphics draw={draw} />
            <Text text={text} style={bubbleStyle} x={x + 8} y={y + 6} />
          </Fragment>
        );
      })}
    </>
  );
}

export function EcologyLayer({ game, worldId }: { game: ServerGame; worldId: Id<'worlds'> }) {
  const eco = game.world.ecology;
  const T = useT();
  const { height, tileDim } = game.worldMap;
  // everyone with a body: agents, and humans who joined as an ant or a grasshopper
  const players = [...game.world.players.values()].filter((p) => !p.human || p.kind);
  const kindOf = (id: any) =>
    game.world.players.get(id)?.kind ??
    (game.playerDescriptions.get(id)?.name.startsWith('Grasshopper') ? 'grasshopper' : 'ant');

  const draw = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      if (!eco) return;
      // sugar: amber squares, stronger = more sugar
      eco.sugar.forEach((s, i) => {
        if (s <= 0.05) return;
        const x = Math.floor(i / height),
          y = i % height;
        g.beginFill(0xffb000, 0.12 + 0.5 * (s / MAX_SUGAR));
        g.drawRect(x * tileDim + 4, y * tileDim + 4, tileDim - 8, tileDim - 8);
        g.endFill();
      });
      // the bar: purple when fun, red when crowded, grey when too empty
      const att = eco.hist[eco.hist.length - 1] ?? 0;
      const color = eco.fun ? 0xb050ff : att > CROWD ? 0xff3030 : 0x888888;
      g.lineStyle(3, color, 0.9);
      g.drawRect(BAR.x * tileDim, BAR.y * tileDim, BAR.w * tileDim, BAR.h * tileDim);
      g.lineStyle(0);
      // energy bars above each agent (green = above its "go to the bar" level, red = below "leave")
      for (const p of players) {
        if (p.energy === undefined) continue;
        const th = THRESHOLDS[kindOf(p.id)];
        const w = Math.min(1, p.energy / 50) * tileDim;
        const c = p.energy < th.leave ? 0xff3030 : p.energy >= th.enter ? 0x30d050 : 0xffd000;
        g.beginFill(0x000000, 0.6);
        g.drawRect(p.position.x * tileDim - tileDim / 2, p.position.y * tileDim - tileDim * 1.3, tileDim, 6);
        g.endFill();
        g.beginFill(c, 1);
        g.drawRect(p.position.x * tileDim - tileDim / 2, p.position.y * tileDim - tileDim * 1.3, w, 6);
        g.endFill();
      }
    },
    [eco, players, height, tileDim],
  );

  if (!eco) return null;
  const nIn = players.filter((p) => atBar(p, Date.now())).length;
  const att = eco.hist[eco.hist.length - 1] ?? 0;
  const label = T.barLabel(
    nIn,
    players.length,
    Math.round(att * 100),
    eco.fun ? 'fun' : att > CROWD ? 'crowded' : 'empty',
  );
  const counts = T.counts(eco.step, eco.alive.ant, eco.dead.ant, eco.alive.grasshopper, eco.dead.grasshopper);
  return (
    <>
      <Sprite
        texture={barTexture}
        x={BAR.x * tileDim}
        y={BAR.y * tileDim}
        width={BAR.w * tileDim}
        height={BAR.h * tileDim}
      />
      <Graphics draw={draw} />
      <Text text={label} style={style} x={BAR.x * tileDim} y={BAR.y * tileDim - 30} />
      <Text text={counts} style={style} x={2 * tileDim} y={1 * tileDim} />
    </>
  );
}
