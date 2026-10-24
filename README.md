# Dino Jumper

A small, dependency-free, classic-inspired dinosaur runner. Open `index.html` directly, or run `npm start` and visit http://localhost:3000.

## Controls

- **Space / ↑ / W / tap:** jump, then press again for a double jump.
- **↓ / S:** duck. Touch devices also have a hold-to-duck button.
- **P / Escape:** pause or resume. Switching away automatically pauses the run.
- **Restart:** begin a new run. Your best score stays saved in this browser.

## The extra adventures

- **Power-ups:** square shield pickups protect against one hit for up to 10 seconds. Clock pickups slow the world for 7 seconds while keeping jumps responsive.
- **Biomes:** desert, snowfield, and volcanic scenery rotate every 300 distance points. They keep the original game's restrained palette and familiar obstacles.
- **Boss:** a large pterodactyl arrives every 600 distance points. Dodge its low rocks by jumping and its high rocks by ducking. Survive the encounter for 100 bonus points.
- **Secret routes:** dotted upper ledges appear periodically. Double jump onto them and collect diamonds worth 25 points each. Staying on the ground is always an option.

The displayed score combines distance and bonuses; biome and boss milestones use distance only. No installation or external assets are needed. Node.js is only needed for the optional local server and tests (`npm test`).
