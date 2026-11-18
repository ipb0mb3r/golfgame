// The one place that says which state or phase is which (Gate A A3). Core, HUD, camera and input
// all ask these predicates instead of listing states themselves, so a new state (menus, rounds,
// S9 overpower) is added here once and nothing else can silently miss it.

// Meter phases (core/swing.js, DESIGN §3 "Missed clicks"). 'aim' = waiting for click 1, 'done' = the swing ended.
// A putt (S14, 2 clicks) goes aim → power → (grace | nopower) → done and never reaches 'accuracy'.
export const METER_PHASES = Object.freeze(['aim', 'power', 'grace', 'nopower', 'accuracy', 'done']);
// The phases in which the meter is running (the player is in the middle of a swing)
export const SWING_PHASES = Object.freeze(['power', 'grace', 'nopower', 'accuracy']);

// Game states (src/game): before the first shot, the swing phases, the ball moving, between shots, the end.
//   intro   the intro card is up      aim      waiting for click 1      (SWING_PHASES) mid-swing
//   flight  ball in the air           roll     ball rolling             wait  core decided what's next, the game shows it
//   holed   ball dropping in the cup  result   the result card is up
export const GAME_STATES = Object.freeze(['intro', 'aim', ...SWING_PHASES, 'flight', 'roll', 'wait', 'holed', 'result']);

const SWINGING = new Set(SWING_PHASES);
// The meter is running
export const isSwinging = phase => SWINGING.has(phase);
// The player is aiming or swinging: the aim guide, the slope readout and "next stroke" count show
export const isAimingState = state => state === 'aim' || isSwinging(state);
// The camera stands behind the ball looking down the aim line (also behind the intro card)
export const isAimView = state => state === 'intro' || isAimingState(state);
// The ball is moving and physics runs
export const isBallMoving = state => state === 'flight' || state === 'roll';

// Ball events (core/ball.js) that end a shot. After one of these core has set play.next (X9: when a
// shot is skipped, all its events arrive at once, and only this one carries the hole flow).
export const SHOT_END_EVENTS = Object.freeze(['holed', 'stopped', 'penalty']);
const SHOT_END = new Set(SHOT_END_EVENTS);
export const isShotEnd = ev => !!ev && SHOT_END.has(ev.type);
