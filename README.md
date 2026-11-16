# Pocket Links

An original, simple 3D arcade golf game that runs in the browser. Built with [Three.js](https://threejs.org/), with no build step: Hole 1 is `index.html` and the prototype Hole 2 is `hole2.html`.

## Play

Once GitHub Pages is switched on, the game is at **https://ipb0mb3r.github.io/golfgame/** and Hole 2 is at **https://ipb0mb3r.github.io/golfgame/hole2.html** (there is also a link to it on Hole 1's start and score screens).

To play on your own computer, download `index.html` and open it in Chrome, Edge, Firefox or Safari (it needs an internet connection to load Three.js).

## How to play

| Action | Keyboard | Mouse / touch |
| --- | --- | --- |
| Aim | ◀ ▶ arrow keys (or A / D) | Hold the ◀ ▶ buttons |
| Change club | ▲ ▼ arrow keys (or W / S) | ‹ › buttons |
| Swing | Space (three presses) | Click the course or the SWING button (three times) |

**The three-click swing**

1. First click starts the meter moving right.
2. Second click sets **power**. The ⚑ mark on the meter is roughly the power needed to reach the pin.
3. The marker swings back. Third click sets **accuracy**: stop it on the green line for a straight shot. Too early curves the ball left (hook), too late curves it right (slice).

Wind (top right) pushes the ball while it is in the air. The rough and bunkers cost you power. Water and out of bounds cost a penalty stroke.

## What's in this sample

- One par 3 hole (166 yards): tee, fairway, rough, three bunkers, a pond and a green with a flag.
- Six clubs plus a putter, picked for you automatically each shot.
- Ball flight with wind, hooks and slices; bounces and roll that depend on the surface.
- Stroke counter, minimap, and a score at the end (birdie, par, bogey and so on).

## Hole 2 (prototype): rolling par 5

- About 490 yards with a raised tee, a big hill in the drive zone, valleys, mounds, a side slope that feeds toward a pond, a cross bunker, and a raised two-level green.
- The ball follows the ground: it speeds up downhill, slows uphill, kicks off the side of a slope when it bounces, and putts curve toward the low side. On gentle slopes a stopped ball stays put; on steep ones (like the step between the green's two levels) it trickles back down.
- A **Slope** readout (top left) and a grid on the green help you read the hills. The aiming ring allows for the hills, and the ⚑ mark on the meter allows for uphill and downhill putts.
- Adds a Driver for the tee shot.
