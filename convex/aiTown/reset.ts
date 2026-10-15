// play-sim-town: start a new run. Every agent is removed and created again from data/characters.ts
// with fresh energy; sugar grows back; the charts clear; one summary line of the old run is kept.
// Humans stay in the town with fresh energy. Triggered by the "Reset run" button (input resetRun)
// or automatically once every agent has starved (Game.tick).
import { Descriptions } from '../../data/characters';
import type { Game } from './game';
import { Player } from './player';
import { Agent } from './agent';
import { AgentDescription } from './agentDescription';
import { nextRunEcology } from './ecology';

export function createAgentFromDescription(game: Game, now: number, descriptionIndex: number) {
  const description = Descriptions[descriptionIndex];
  const playerId = Player.join(game, now, description.name, description.character, description.identity);
  const agentId = game.allocId('agents');
  game.world.agents.set(
    agentId,
    new Agent({
      id: agentId,
      playerId,
      inProgressOperation: undefined,
      lastConversation: undefined,
      lastInviteAttempt: undefined,
      toRemember: undefined,
    }),
  );
  game.agentDescriptions.set(
    agentId,
    new AgentDescription({ agentId, identity: description.identity, plan: description.plan }),
  );
  return { agentId, playerId };
}

export function resetRun(game: Game, now: number, why: 'reset' | 'extinct') {
  const world = game.world;
  const prev = world.ecology;
  // remove every agent and its body
  for (const [agentId, agent] of [...world.agents.entries()]) {
    world.agents.delete(agentId);
    game.agentDescriptions.delete(agentId);
    world.players.get(agent.playerId)?.leave(game, now);
  }
  // humans stay, with fresh energy and no bar visit
  for (const p of world.players.values()) {
    delete p.energy;
    delete p.inBarUntil;
  }
  world.ecology = nextRunEcology(game, now, prev, why);
  for (let i = 0; i < Descriptions.length; i++) createAgentFromDescription(game, now, i);
  console.log(`play-sim-town: run ${world.ecology.run} started (${why})`);
}
