# Dino Jumper

Optional discoveries now include nine distinct mutation engines with double points and preserved entry speed. The biome pool contains 55 shuffled normal regions. Five additional mechanical bosses extend the campaign through 25,000 points. See the 25,000-point expansion section below for controls and milestones.

A small, dependency-free, classic-inspired dinosaur runner. Open `index.html` directly, or run `npm start` (or `node scripts/serve.js`) and visit http://localhost:3000.

The home screen has three destinations: **Play game** (`play.html`), **Game rules** (`instructions.html`), and **Achievements** (`achievements.html`). The play screen keeps the title, game, and essential HUD. The rules have a quick start and five collapsible chapters, with direct topic links. Rules and achievement links on the play screen open in a new tab so the current run can stay paused.

## Achievement map

The Minecraft-inspired advancement map uses original pixel icons and a connected, draggable, zoomable graph. Six branches contain **48 persistent achievements**: The Long Road, Monster Hunter, Into the Unknown, Fossil Record, Against All Odds, and Strange Science. Select a node to see its exact goal, progress, prerequisites, point value, and earned date. Gold nodes are earned, light frames are available, and muted frames have unmet prerequisites. Use the branch tabs, drag/scroll the map, zoom buttons, or keyboard navigation to explore.

Goals cover distance, single-run challenges, clean bosses, a flawless gauntlet, collecting without a magnet, a 55-point fossil, all 48 named biomes in shuffled order after the starting Desert, full weather events, late boss-fight revivals, two-egg comebacks, all nine upgrades, repeated and mixed builds, Fast Fall clears, and a gauntlet without double jumping. Progress is recorded by actual gameplay events and saved locally. Existing journal data imports verified totals, best score, visited biomes, and defeated bosses; advanced challenge conditions start tracking with new runs. A brief toast announces new achievements. `achievements-data.js` defines the goals and graph, while `achievement-engine.js` handles progress independently of the map interface.

## Deploy to Vercel

Import this repository with its root directory set to the repository root (leave the Root Directory field empty). The included `vercel.json` selects the **Other** framework preset, builds with `node scripts/build.js`, and publishes `dist/` as a static website. No environment variables or backend server are required.

Push the source files, including `vercel.json` and `scripts/build.js`, then create a new deployment. If you set custom project overrides previously, use **Other**, build command **node scripts/build.js**, and output directory **dist**. Do not use the local preview server as Vercel's build command.

To check the production output locally, run `npm run build` (or `node scripts/build.js`). This copies only the three browser assets into `dist/`; the preview server and tests are excluded from the deployment.

## Controls

- **Space / ↑ / W / tap:** jump, then press again for a double jump.
- **↓ / S:** duck. Touch devices also have a hold-to-duck button.
- **X / PHASE button:** phase through hazards for 0.34 seconds; five-second cooldown. Works on the ground and in the air without spending eggs or shields.
- **P / Escape:** pause or resume. Switching away automatically pauses the run.
- **Restart:** begin a new run. Your best score stays saved in this browser.

## The extra adventures

- **Two revivals per run:** you start with two Dino Eggs. After a hit, choose **Hatch Again** to keep your score, perks, and boss progress, or **End This Run**. Reviving clears hazards and grants at least two seconds of protection. The third unshielded hit ends the run. Eggs reset on a new run.
- **Power-ups:** shield pickups protect against one hit for 10 seconds, extended by shell perks up to 18. Clock pickups slow the world for 7 seconds while keeping jumps responsive.
- **Random obstacles:** varied shapes, sizes, starting positions, and gaps, with fresh timing each run. Starting speed is **500 pixels/second**, increasing to **920** in about 20 seconds of normal running. Normal obstacle gaps vary from 0.78 to 1.35 seconds.
- **Biomes every 3,000 displayed points:** 48 named regions, including forests, jungles, swamps, coasts, canyons, caverns, ruins, cities, fungal woods, glaciers, and space. After those, a deterministic frontier generator creates numbered regions with new names, palettes, and scenery arrangements instead of restarting the original list. Scenery and obstacles are drawn in canvas, with no image packs, backend, or extra asset downloads. Only the active generated theme is cached. In the last 400 points, no new normal obstacles or events spawn; routes stop earlier. Existing objects scroll away naturally, preserving their original biome appearance. A border announcement and a one-second scenery fade mark the crossing. Boss introductions wait for leftover obstacles to leave instead of deleting them.
- **Boss milestones stay at 1,000 / 2,000 / 3,000 / 4,000 / 5,000 points.** Fight lengths randomize by ±0.3 seconds around 11 / 12 / 13 / 14 / 15 seconds. Bird volleys vary spacing and delays; Prism uses scanning laser locks and a shuffled action bag; Quarry adds twin returning magnets; Dragon uses shuffled Rift Cage / High Tide / Ash Seal arena puzzles with randomized safe stones; Shadow uses shots from both sides and double-jump curtains. Every pressure wave leaves a recovery gap. Victories emit 45–65 colored particles lasting 1.2–2.1 seconds, with a 2.5-second boss recovery window. Rewards remain 50–250 points.
- **Upgrades after every two defeated bosses:** picks occur after bosses **2 and 4**, rather than biome changes. Each pick offers three unique random cards from **nine upgrades**: Longer Shield, Pickup Magnet, Fast Fall, Valuable Fossils, Longer Slow Motion, Safer Revival, Boss Shield, Easy Shell Repair, and High Road Treasure. Cards explain their effect, current/new values, and level cap. Click or press **1 / 2 / 3**, or skip. Maxed perks stop appearing; upgrades stay through revivals and reset on a new run. An equipped-upgrades bar above the game shows your current perks and actual effects. See `instructions.html` for every effect and cap.
- **Scenic and daring upper routes:** wide ledges offer safer collecting; narrow ledges can have an upper-lane bird to jump over. Ground routes stay available. Collect fossils for 25 points and egg fragments; three fragments rebuild a protective shield, keeping the revival cap at two.
- **Biome events:** six-second snow squalls, meteor showers, mini stampedes, and firefly trails. Meteors and stampedes replace normal obstacle spawns rather than stacking new walls of hazards. Firefly trails contain extra fossils. Boss arrival clears events.
- **Persistent progress:** the new achievement map replaces the journal on the game page. Legacy journal records remain available for migration; achievement statistics and goals save across runs in this browser. Saving failures never prevent playing.

Attack warnings, patterns, fight lengths and platform geometry are randomized inside tested limits. Full fights are checked without shields, revives or phase on desktop and mobile. The crouching dinosaur uses a dedicated pixel sprite and lower hitbox.

Both biome and boss milestones use the displayed score, including bonuses. No installation, accounts, or external assets are needed. Node.js is only needed for the optional local server, build, and tests (`npm test`).

Runs always start in the plain Desert. Gameplay choices use browser crypto randomness where available, with a Math.random fallback. Later named biomes are shuffled per run; terrain dimensions/counts/spacing, secret destinations, pickup positions, and portal prizes vary inside tested ranges. The first secret route is a five-step staircase with a destination gate. Portal offers let players choose among three named worlds; the biome atlas in the rules lists all six and explains their chapters. Falling below a void lip latches a fatal fall, blocking jump/phase rescue. Jump physics, milestone spacing, and warning minimums remain stable.

## 25,000-point expansion

The catalog now contains 55 non-repeating shuffled normal regions and nine mutations. Portals preserve effective entry speed and award double distance points, 50-point fossils, and a 450–650 point completion bonus. Main-world mutations also pay double distance points. The nine mutation engines are collapsing void islands, hidden bone crushers, concealed forest traps, UFO crystal flight, ship meteor flight, spring-driven lava crossings, a rhythm runner, phantom walls, and a fuel-limited jetpack. Hidden-door deaths end the run. Main-world deaths retain ordinary revivals.

Five additional bosses appear at 8,000 / 12,000 / 16,000 / 20,000 / 25,000 points: Beat Reaper, Press Sovereign, Parallax Moth, Ion Leviathan, and Null Architect. Their scroll speed rises across the five fights. The last uses hold-to-boost jetpack height and fuel regeneration. The campaign ends after boss ten. Fossil-value perks apply before the mutation multiplier, and collected fossils count toward museum and achievement statistics. Ship and jetpack modes support Space/Up/W holds, holding the canvas, and a touch BOOST button; UFO mode uses discrete taps. All trap generation and mode physics live in trials.js.
