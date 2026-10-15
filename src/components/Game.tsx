import { useRef, useState } from 'react';
import PixiGame from './PixiGame.tsx';

import { useElementSize } from 'usehooks-ts';
import { Stage } from '@pixi/react';
import { ConvexProvider, useConvex, useQuery } from 'convex/react';
import PlayerDetails from './PlayerDetails.tsx';
import { MetricsPanel } from './MetricsPanel.tsx';
import { ChatBox } from './ChatBox.tsx';
import { LangToggle, Onboarding, YouCard, useOnboardingOpen } from './Onboarding.tsx';
import { api } from '../../convex/_generated/api';
import { useWorldHeartbeat } from '../hooks/useWorldHeartbeat.ts';
import { useHistoricalTime } from '../hooks/useHistoricalTime.ts';
import { DebugTimeManager } from './DebugTimeManager.tsx';
import { GameId } from '../../convex/aiTown/ids.ts';
import { useServerGame } from '../hooks/serverGame.ts';

export const SHOW_DEBUG_UI = !!import.meta.env.VITE_SHOW_DEBUG_UI;

export default function Game() {
  const convex = useConvex();
  const [selectedElement, setSelectedElement] = useState<{
    kind: 'player';
    id: GameId<'players'>;
  }>();
  const [gameWrapperRef, { width, height }] = useElementSize();
  const [onboardingOpen, setOnboardingOpen] = useOnboardingOpen();

  const worldStatus = useQuery(api.world.defaultWorldStatus);
  const worldId = worldStatus?.worldId;
  const engineId = worldStatus?.engineId;

  const game = useServerGame(worldId);

  // Send a periodic heartbeat to our world to keep it alive.
  useWorldHeartbeat();

  const worldState = useQuery(api.world.worldState, worldId ? { worldId } : 'skip');
  const { historicalTime, timeManager } = useHistoricalTime(worldState?.engine);

  const scrollViewRef = useRef<HTMLDivElement>(null);

  if (!worldId || !engineId || !game) {
    return null;
  }
  return (
    <>
      {SHOW_DEBUG_UI && <DebugTimeManager timeManager={timeManager} width={200} height={100} />}
      <div className="absolute inset-0">
        {/* Game area */}
        <div className="absolute inset-y-0 left-0 right-0 md:right-[400px] overflow-hidden bg-brown-900" ref={gameWrapperRef}>
          <div className="absolute inset-0">
            <div className="container">
              <Stage width={width} height={height} options={{ backgroundColor: 0x1b2a14 }}>
                {/* Re-propagate context because contexts are not shared between renderers.
https://github.com/michalochman/react-pixi-fiber/issues/145#issuecomment-531549215 */}
                <ConvexProvider client={convex}>
                  <PixiGame
                    game={game}
                    worldId={worldId}
                    engineId={engineId}
                    width={width}
                    height={height}
                    historicalTime={historicalTime}
                    setSelectedElement={setSelectedElement}
                  />
                </ConvexProvider>
              </Stage>
            </div>
          </div>
        </div>
        {/* play-sim-town: join as an ant or a grasshopper; talk with the agents in the chat box below */}
        <div className="absolute top-3 left-3 z-10 flex w-80 max-w-[calc(100%-6rem)] flex-col gap-2">
          <YouCard game={game} worldId={worldId} openOnboarding={() => setOnboardingOpen(true)} />
          <ChatBox game={game} worldId={worldId} engineId={engineId} />
        </div>
        <LangToggle />
        <Onboarding worldId={worldId} open={onboardingOpen} setOpen={setOnboardingOpen} />
        {/* play-sim-town: survival vs play panel */}
        <div className="absolute inset-y-0 right-0 w-[400px] hidden md:block border-l-4 border-brown-900">
          <MetricsPanel game={game} worldId={worldId} engineId={engineId} />
        </div>
        {/* Right column area: character details, over the panel when a character is clicked */}
        <div
          className={`absolute top-0 right-0 bottom-0 w-[400px] max-w-full flex flex-col overflow-y-auto px-4 py-6 border-l-8 border-brown-900 bg-brown-800/95 text-brown-100 ${
            selectedElement ? '' : 'hidden'
          }`}
          ref={scrollViewRef}
        >
          <PlayerDetails
            worldId={worldId}
            engineId={engineId}
            game={game}
            playerId={selectedElement?.id}
            setSelectedElement={setSelectedElement}
            scrollViewRef={scrollViewRef}
          />
        </div>
      </div>
    </>
  );
}
