# play-sim-town — El Farol × Sugarscape inside AI Town

play-sim v0 (`../play-sim/`, numpy) moved onto an open-source Sims-like simulator:
[a16z-infra/ai-town](https://github.com/a16z-infra/ai-town) (MIT), cloned at `8e05997` (2026-08-25).
**Status 2026-10-15: running locally, not validated, no results yet, nothing pushed, nothing committed.**

## What was added
| file | what |
|---|---|
| `convex/aiTown/ecology.ts` (new) | the rules. **Sugarscape:** two sugar hills, regrowth `REGROW` per tile per step, metabolism, eat the tile you stand on, death at energy 0. **El Farol:** a bar in the central plaza (`BAR`); fun only between 15% and 60% attendance; each agent owns 3 of 8 attendance forecasts and trusts the most accurate one (Arthur 1994). **Ants/grasshoppers:** different enter/leave energy thresholds (`THRESHOLDS`). One eco-step per second (`ECO_STEP_MS`). |
| `convex/aiTown/{world,player,game,agent,agentOperations}.ts` | hooks: ecology state in the world doc, `energy`/`inBarUntil` on players, `ecoStep` in the game tick, `ecoDecide` before the agent's usual LLM loop; LLM conversations only between agents in the bar; a hungry agent walks out of its conversation |
| `data/characters.ts` | 15 ants + 15 grasshoppers (`kind` field; identity/plan go to the LLM; 8 sprites, so looks repeat) |
| `src/App.tsx`, `src/components/{Game,PixiViewport}.tsx` | just the world, full window: no title, frame or footer; it opens zoomed out to the whole map; the conversation panel appears only when you click a character |
| `src/components/MetricsPanel.tsx` (new) | right-hand panel: alive per kind, share playing now, bar attendance vs the 60% line, play vs survival time over the run, live conversation feed |
| `src/components/Onboarding.tsx`, `src/hooks/humanToken.ts` (new) | join as a human: welcome → ant or grasshopper → character and name → mini tutorial; a "you" card with energy and hints; each browser has its own player id (no login). Humans live under the same rules: energy, eating, starving, counted in attendance |
| `data/make_bar.py` → `assets/bar.png` (new) | the bar as a pixel-art tavern interior (drawn by script, no third-party art) |
| `src/components/EcologyLayer.tsx` (new) | draws sugar (amber), the bar (purple = fun, red = crowded, grey = empty), energy bars, and the alive/dead counts |

Same rule set as v0, but in real time, with fewer agents (30, not 100), and with LLM conversations in the bar (speech bubbles over the speakers). The friendship and sharing layer from v0 is **not** ported yet.

## Run (all local, no Convex account; the page is on localhost, but the Convex local backend listens on all interfaces by default)
```sh
export PATH=$HOME/opt/node20/bin:$PATH        # the Convex CLI needs Node >= 20
CONVEX_AGENT_MODE=anonymous npx convex dev --run init --until-success   # first time: seed the town
CONVEX_AGENT_MODE=anonymous npx convex dev --tail-logs                   # backend on 127.0.0.1:3210
npx vite --host 127.0.0.1 --port 5173                                    # open http://127.0.0.1:5173/ai-town
```
Over Cursor/SSH: forward ports 5173, 3210 and 3211 (Ports panel) and keep the same numbers locally.
LLM: the host's Ollama on 127.0.0.1:11434 (`llama3` for chat, `mxbai-embed-large` for embeddings).
Reset the town: `npx convex run testing:wipeAllTables` and then the seed step again.

## Next
1. Port the v0 friendship and sharing layer (`participatedTogether` already records who talked).
2. Headless runs: N seeds × regrowth levels, logging the alive/dead counts → compare with v0's three boards.
3. Make the LLM choose between going to the bar and foraging, replacing the hand-written thresholds (the actual research question).
4. Decide with the group: AI Town as the shared engine, or not (the first open decision in `../STATUS.md`).

## Cloud deployment (2026-10-15)
- **Page:** Vercel project `play-sim-town` (team earnestkcarr-gmailcoms-projects), protected by Vercel Authentication:
  https://play-sim-town-earnestkcarr-gmailcoms-projects.vercel.app/ai-town/ . To share with people outside the Vercel team, use the deployment's **Share** link in the Vercel dashboard.
- **Backend:** Convex cloud, project `playvsurvive`, dev deployment `veracious-grasshopper-429` (settings in `.env.cloud`, git-ignored). `.env.local` stays on the anonymous local backend.
- **LLM:** your local Ollama, reached through `tools/ollama-gate.mjs` (127.0.0.1:11435; key in `~/.config/playsim/ollama-gate.key`; only chat and embeddings, key required) and a Cloudflare quick tunnel. Convex env vars: `OLLAMA_HOST` = the tunnel URL, `OLLAMA_GATE_KEY` = the key.
- **Fragile parts:** the quick-tunnel URL changes whenever `cloudflared` restarts. Then run `npx convex env set --deployment veracious-grasshopper-429 OLLAMA_HOST <new url>`. The gate, the tunnel and Ollama must be running on this machine for the agents to talk; without them the town still moves, but nobody speaks.
- **Redeploy:**
  - backend: `npx convex dev --once --env-file .env.cloud`, then restore `.env.local` from `.env.local.anonymous-local`, because that command rewrites it;
  - page: `vercel deploy --yes --build-env VITE_CONVEX_URL=https://veracious-grasshopper-429.convex.cloud --build-env VITE_CONVEX_SITE_URL=https://veracious-grasshopper-429.convex.site`.
