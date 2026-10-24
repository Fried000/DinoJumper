# Dino Jumper

A small, dependency-free, classic-inspired dinosaur runner. Open `index.html` directly, or run `npm start` (or `node scripts/serve.js`) and visit http://localhost:3000.

## Deploy to Vercel

Import this repository with its root directory set to the repository root (leave the Root Directory field empty). The included `vercel.json` selects the **Other** framework preset, builds with `node scripts/build.js`, and publishes `dist/` as a static website. No environment variables or backend server are required.

Push the source files, including `vercel.json` and `scripts/build.js`, then create a new deployment. If you set custom project overrides previously, use **Other**, build command **node scripts/build.js**, and output directory **dist**. Do not use the local preview server as Vercel's build command.

To check the production output locally, run `npm run build` (or `node scripts/build.js`). This copies only the three browser assets into `dist/`; the preview server and tests are excluded from the deployment.

## Controls

- **Space / ↑ / W / tap:** jump, then press again for a double jump.
- **↓ / S:** duck. Touch devices also have a hold-to-duck button.
- **P / Escape:** pause or resume. Switching away automatically pauses the run.
- **Restart:** begin a new run. Your best score stays saved in this browser.

## The extra adventures

- **Two revivals per run:** you start with two Dino Eggs. After a hit, choose **Hatch Again** to keep your score, perks, and boss progress, or **End This Run**. Reviving clears hazards and grants at least two seconds of protection. The third unshielded hit ends the run. Eggs reset on a new run.
- **Power-ups:** shield pickups protect against one hit for 10 seconds, extended by shell perks up to 18. Clock pickups slow the world for 7 seconds while keeping jumps responsive.
- **Random obstacles:** varied shapes, sizes, starting positions, and gaps, with fresh timing each run. Starting speed is **500 pixels/second**, increasing to **920** in about 20 seconds of normal running. Normal obstacle gaps vary from 0.78 to 1.35 seconds.
- **Biomes every 1,000 displayed points:** 48 named regions, including forests, jungles, swamps, coasts, canyons, caverns, ruins, cities, fungal woods, glaciers, and space. After those, a deterministic frontier generator creates numbered regions with new names, palettes, and scenery arrangements instead of restarting the original list. Scenery and obstacles are drawn in canvas, with no image packs, backend, or extra asset downloads. Only the active generated theme is cached.
- **Bosses at 1,000 / 2,000 / 3,000 / 4,000 / 5,000 displayed points:** fight the bird for **7 seconds**, triceratops for **7.5**, T. rex for **8**, dragon for **8.5**, and shadow for **9**. Boss rewards are 50–250 points. The bird chooses six different train/pair/scatter patterns with varied spacing and ceiling shots, never repeats the same pattern consecutively, and never uses the same height more than twice in a row. Other bosses retain their charge, boulder, lava, and echo combinations. A victory screen follows boss five; **Explore On** continues into the frontier without more bosses.
- **Perks at each biome change:** the game pauses and the next boss waits while you choose **Thick Shell**, **Fossil Magnet**, or **Fast Fall**. Use buttons or keys **1 / 2 / 3**, or skip. Shell extends shields and revive protection; magnets attract nearby pickups; Fast Fall lets you hold down while descending. Further Fast Fall picks add ten points per fossil. Perks last for the run.
- **Scenic and daring upper routes:** wide ledges offer safer collecting; narrow ledges can have an upper-lane bird to jump over. Ground routes stay available. Collect fossils for 25 points and egg fragments; three fragments rebuild a protective shield, keeping the revival cap at two.
- **Biome events:** six-second snow squalls, meteor showers, mini stampedes, and firefly trails. Meteors and stampedes replace normal obstacle spawns rather than stacking new walls of hazards. Firefly trails contain extra fossils. Boss arrival clears events.
- **Persistent discovery journal:** visited worlds, beaten bosses, secret routes, events, perks, fossils, run count, revivals, and best score are saved in this browser. Open **Field Journal** below the game to inspect them; opening it pauses an active run. Saving failures never prevent playing.

Boss attacks show a warning 0.45 seconds before launch. Volleys keep firing while earlier projectiles are still in flight. Projectile travel time is bounded on smaller screens; individual volley escape timing is tested at both opening and maximum speed. The crouching dinosaur uses a separate sprite on an integer pixel grid with a matching lower hitbox.

Both biome and boss milestones use the displayed score, including bonuses. No installation, accounts, or external assets are needed. Node.js is only needed for the optional local server, build, and tests (`npm test`).
