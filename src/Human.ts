import { Scene, Sprite } from "./lib";
import type { Direction, Vec2 } from "./lib/types";

export default class Human extends Sprite {
  static CRUISE_SPEED = 4;
  static GRIND_SPEED = 4;
  static TRICK_SPEED = 4;
  static WALK_SPEED = 1;

  tileSize: number;

  constructor(scene: Scene, pos: Vec2) {
    super(scene, pos, 16, 32, "s");

    this.tileSize = scene.art!.tileSize;

    this.animations.registerSpritesheet("skater", REPEAT_DEFAULTS);

    this.animations.onFrameChange = (
      name: string,
      currentFrame: number,
      _: number,
    ) => {
      const updateType = AnimationPositionUpdates[name];

      if (updateType === undefined) return; // overlay or unknown

      if (updateType === PositionUpdateType.VEL) {
        this.pos.x += this.vel.x;
        this.pos.y += this.vel.y;
        return;
      } else if (updateType == PositionUpdateType.DELTA) {
        const xDirMultiplier = name.includes("-w") ? -1 : 1;
        // const yDirMultiplier = name.includes("-s") ? -1 : 1;

        const motion = Motions[name];

        if (motion) {
          this.pos.x += motion[currentFrame].dx * xDirMultiplier;
          this.pos.y += motion[currentFrame].dy;
        }
      }
    };
  }

  update(dt: number): void {
    // this.animations.update(dt);
  }

  getEstimatedDistanceForAnim(name: string, vel?: Vec2): Vec2 {
    const updateType = AnimationPositionUpdates[name];
    const repeat = REPEAT_DEFAULTS[name]?.repeat ?? false;
    const dist: Vec2 = { x: 0, y: 0 };

    if (updateType === PositionUpdateType.DELTA) {
      const xDirMultiplier = name.includes("-w") ? -1 : 1;
      const motionKey = resolveMotionKey(name);
      const frames = motionKey ? Motions[motionKey] : undefined;

      if (!frames) return dist;

      const sumFrames = () => {
        for (const f of frames) {
          dist.x += f.dx * xDirMultiplier;
          dist.y += f.dy;
        }
      };

      if (repeat === false) {
        sumFrames();
      } else if (typeof repeat === "number") {
        for (let i = 0; i < repeat; i++) sumFrames();
      } else {
        // infinite loop — return direction * Infinity
        sumFrames();
        if (dist.x !== 0) dist.x = Infinity * Math.sign(dist.x);
        if (dist.y !== 0) dist.y = Infinity * Math.sign(dist.y);
      }
    } else if (updateType === PositionUpdateType.VEL) {
      const frameCount = this.animations.getFrameCount(name);

      if (repeat === false) {
        dist.x = (vel?.x ?? 0) * frameCount;
        dist.y = (vel?.y ?? 0) * frameCount;
      } else if (typeof repeat === "number") {
        dist.x = (vel?.x ?? 0) * frameCount * repeat;
        dist.y = (vel?.y ?? 0) * frameCount * repeat;
      } else {
        dist.x = (vel?.x ?? 0) !== 0 ? Infinity * Math.sign(vel!.x) : 0;
        dist.y = (vel?.y ?? 0) !== 0 ? Infinity * Math.sign(vel!.y) : 0;
      }
    }

    return dist;
  }
}

export function getBoardFlipOverlay(direction: Direction) {
  switch (direction) {
    case "n":
      return {
        name: "flip-board-n",
        drawOnTop: false,
        drawBehind: true,
        dy: 0,
        dx: 0,
      };
    case "e":
      return {
        name: "flip-board-e",
        drawOnTop: false,
        drawBehind: true,
        dy: 3,
        dx: 8,
      };
    case "s":
      return {
        name: "flip-board-s",
        drawOnTop: true,
        drawBehind: false,
        dy: 13,
        dx: 0,
      };
    case "w":
      return {
        name: "flip-board-w",
        drawOnTop: false,
        drawBehind: true,
        dy: 3,
        dx: -8,
      };
  }
}

export function getBoardCarryOverlay(
  direction: Direction,
  isIdle: boolean = false,
) {
  switch (direction) {
    case "n":
      return {
        name: `board-carry-${isIdle ? "idle-" : ""}r`,
        drawOnTop: false,
        drawBehind: true,
        dy: 5,
        dx: 1,
      };
    case "ne":
      break;
    case "e":
      return {
        name: `board-carry-${isIdle ? "idle-" : ""}c`,
        drawOnTop: true,
        drawBehind: false,
        dy: -1,
        dx: 0,
      };
    case "se":
    case "s":
      return {
        name: `board-carry-${isIdle ? "idle-" : ""}l`,
        drawOnTop: false,
        drawBehind: true,
        dy: 5,
        dx: -1,
      };
    case "sw":
    case "w":
      return {
        name: `board-carry-${isIdle ? "idle-" : ""}c`,
        drawOnTop: false,
        drawBehind: true,
        dy: -2,
        dx: 0,
      };
    case "nw":
  }
}

const VEL_ANIMS = [
  "walk-n",
  "walk-s",
  "walk-e",
  "walk-w",
  "walk-board-n",
  "walk-board-s",
  "walk-board-e",
  "walk-board-w",
  "idle-sit-n",
  "idle-sit-s",
  "idle-stand-n",
  "idle-stand-s",
  "idle-stand-w",
  "idle-stand-e",
  "idle-stand-board-n",
  "idle-stand-board-s",
  "prep-n",
  "prep-s",
  "flip-n",
  "flip-s",
  "flip-w",
  "flip-e",
  "180-f",
  "180-b",
  "360-f",
  "360-b",
  "180-e-cw",
  "180-e-ccw",
  "180-w-cw",
  "180-w-ccw",
  "360-e-cw",
  "360-e-ccw",
  "360-w-cw",
  "360-w-ccw",
  "grab-f",
  "grab-b",
  "grab-w",
  "grab-e",
  "kickflip-f",
  "kickflip-b",
  "shove-it-f",
  "shove-it-b",
  "ollie-f",
  "ollie-b",
  "nose-grind-f-w",
  "nose-grind-b-w",
  "nose-grind-f-e",
  "nose-grind-b-e",
  "cruise-n",
  "cruise-s",
  "cruise-f-e",
  "cruise-f-w",
  "cruise-b-e",
  "cruise-b-w",
  "climb-up",
  "climb-down",
] as const;

const DELTA_ANIMS = [
  "cruise-ramp-f-e",
  "cruise-ramp-f-w",
  "cruise-ramp-b-e",
  "cruise-ramp-b-w",
  "cruise-bowl-f-e",
  "cruise-bowl-f-w",
  "cruise-bowl-b-e",
  "cruise-bowl-b-w",
  "cruise-bowl-s-w",
  "cruise-bowl-n-w",
  "cruise-bowl-s-e",
  "cruise-bowl-n-e",
  "jump-up-f-w",
  "jump-up-b-w",
  "jump-up-f-e",
  "jump-up-b-e",
  "jump-down-f-w",
  "jump-down-b-w",
  "jump-down-f-e",
  "jump-down-b-e",
  "ramp-land-w",
  "ramp-land-e",
] as const;

type AnimationPositionUpdateMap = Record<string, PositionUpdateType>;

enum PositionUpdateType {
  VEL,
  DELTA,
}

const AnimationPositionUpdates: AnimationPositionUpdateMap = {
  ...Object.fromEntries(
    VEL_ANIMS.map((name) => [name, PositionUpdateType.VEL]),
  ),
  ...Object.fromEntries(
    DELTA_ANIMS.map((name) => [name, PositionUpdateType.DELTA]),
  ),
};

const REPEAT_DEFAULTS: Record<string, { repeat: number | boolean }> = {
  // Looping
  "walk-n": { repeat: true },
  "walk-s": { repeat: true },
  "walk-e": { repeat: true },
  "walk-w": { repeat: true },
  "walk-board-n": { repeat: true },
  "walk-board-s": { repeat: true },
  "walk-board-e": { repeat: true },
  "walk-board-w": { repeat: true },
  "idle-sit-n": { repeat: true },
  "idle-sit-s": { repeat: true },
  "idle-stand-n": { repeat: true },
  "idle-stand-s": { repeat: true },
  "idle-stand-w": { repeat: true },
  "idle-stand-e": { repeat: true },
  "idle-stand-board-n": { repeat: true },
  "idle-stand-board-s": { repeat: true },
  "nose-grind-f-w": { repeat: true },
  "nose-grind-b-w": { repeat: true },
  "nose-grind-f-e": { repeat: true },
  "nose-grind-b-e": { repeat: true },
  "cruise-n": { repeat: true },
  "cruise-s": { repeat: true },
  "cruise-f-e": { repeat: true },
  "cruise-f-w": { repeat: true },
  "cruise-b-e": { repeat: true },
  "cruise-b-w": { repeat: true },
  "climb-up": { repeat: true },
  "climb-down": { repeat: true },
  // Play once
  "prep-n": { repeat: false },
  "prep-s": { repeat: false },
  "flip-n": { repeat: false },
  "flip-s": { repeat: false },
  "flip-w": { repeat: false },
  "flip-e": { repeat: false },
  "180-f": { repeat: false },
  "180-b": { repeat: false },
  "360-f": { repeat: false },
  "360-b": { repeat: false },
  "180-e-cw": { repeat: false },
  "180-e-ccw": { repeat: false },
  "180-w-cw": { repeat: false },
  "180-w-ccw": { repeat: false },
  "360-e-cw": { repeat: false },
  "360-e-ccw": { repeat: false },
  "360-w-cw": { repeat: false },
  "360-w-ccw": { repeat: false },
  "grab-f": { repeat: false },
  "grab-b": { repeat: false },
  "grab-w": { repeat: false },
  "grab-e": { repeat: false },
  "kickflip-f": { repeat: false },
  "kickflip-b": { repeat: false },
  "shove-it-f": { repeat: false },
  "shove-it-b": { repeat: false },
  "ollie-f": { repeat: false },
  "ollie-b": { repeat: false },
  "cruise-ramp-f-e": { repeat: false },
  "cruise-ramp-f-w": { repeat: false },
  "cruise-ramp-b-e": { repeat: false },
  "cruise-ramp-b-w": { repeat: false },
  "cruise-bowl-f-e": { repeat: false },
  "cruise-bowl-f-w": { repeat: false },
  "cruise-bowl-b-e": { repeat: false },
  "cruise-bowl-b-w": { repeat: false },
  "cruise-bowl-s-w": { repeat: false },
  "cruise-bowl-n-w": { repeat: false },
  "cruise-bowl-s-e": { repeat: false },
  "cruise-bowl-n-e": { repeat: false },
  "jump-up-f-w": { repeat: false },
  "jump-up-b-w": { repeat: false },
  "jump-up-f-e": { repeat: false },
  "jump-up-b-e": { repeat: false },
  "jump-down-f-w": { repeat: false },
  "jump-down-b-w": { repeat: false },
  "jump-down-f-e": { repeat: false },
  "jump-down-b-e": { repeat: false },
  "ramp-land-w": { repeat: false },
  "ramp-land-e": { repeat: false },
};

function resolveMotionKey(name: string): string | null {
  if (name.startsWith("cruise-ramp")) return "cruise-ramp";
  if (name.startsWith("cruise-bowl-s")) return "cruise-bowl-s";
  if (name.startsWith("cruise-bowl-n")) return "cruise-bowl-n";
  if (name.startsWith("cruise-bowl")) return "cruise-bowl-h";
  if (name.startsWith("jump-up")) return `jump-up-${name.includes("-e") ? "e" : "w"}`;
  if (name.startsWith("jump-down")) return `jump-down-${name.includes("-e") ? "e" : "w"}`;
  if (name.startsWith("ramp-land")) return null; // no delta data
  return name; // kickflip-f, shove-it-b, etc. match directly
}

const Motions: Record<string, { dx: number; dy: number }[]> = {
  "cruise-ramp": [
    { dx: 7, dy: 9 },
    { dx: 9, dy: 14 },
    { dx: 12, dy: 6 },
    { dx: 18, dy: 4 },
    { dx: 16, dy: 0 },
    { dx: 18, dy: -4 },
    { dx: 12, dy: -6 },
    { dx: 9, dy: -14 },
    { dx: 7, dy: -9 },
    { dx: 0, dy: 0 },
  ],

  "cruise-bowl-h": [
    { dx: 2, dy: 4 },
    { dx: 8, dy: 6 },
    { dx: 12, dy: 4 },
    { dx: 16, dy: 2 },
    { dx: 36, dy: 0 },
    { dx: 16, dy: -2 },
    { dx: 12, dy: -4 },
    { dx: 8, dy: -6 },
    { dx: 2, dy: -4 },
  ],

  "cruise-bowl-s": [
    { dx: 0, dy: 4 },
    { dx: 0, dy: 24 },
    { dx: 0, dy: 16 },
    { dx: 0, dy: 16 },
    { dx: 0, dy: 16 },
    { dx: 0, dy: 24 },
    { dx: 0, dy: 4 },
  ],

  "cruise-bowl-n": [
    { dx: 0, dy: -4 },
    { dx: 0, dy: -24 },
    { dx: 0, dy: -16 },
    { dx: 0, dy: -16 },
    { dx: 0, dy: -16 },
    { dx: 0, dy: -24 },
    { dx: 0, dy: -4 },
  ],

  "jump-flat": [
    { dx: 0, dy: 4 },
    { dx: 0, dy: 0 },
    { dx: 0, dy: 0 },
    { dx: 0, dy: 0 },
    { dx: 0, dy: -4 },
  ],
  "jump-up-e": [{ dx: 4, dy: -8 }],
  "jump-down-e": [{ dx: 8, dy: 8 }],
  "jump-up-w": [{ dx: -4, dy: -8 }],
  "jump-down-w": [{ dx: -8, dy: 8 }],

  "kickflip-f": Array(2).fill({ dx: -4, dy: 0 }),
  "kickflip-b": Array(2).fill({ dx: 4, dy: 0 }),
  "shove-it-f": Array(4).fill({ dx: -2, dy: 0 }),
  "shove-it-b": Array(4).fill({ dx: 2, dy: 0 }),
};

// function createAnimationsFromAseprite(
//   asepriteData: AsepriteJSON,
//   animationSettings: Record<
//     string,
//     | { driver: PositionUpdateType; repeat: number | boolean; isAnim: true }
//     | { isAnim: false }
//   >,
// ): {
//   animations: Record<string, AnimationConfigT<PositionUpdateType>>;
//   overlays: Record<string, AnimationOverlay>;
// } {
//   const animations: Record<string, AnimationConfigT<PositionUpdateType>> = {};
//   const overlays: Record<string, AnimationOverlay> = {};

//   for (const tag of asepriteData.meta.frameTags) {
//     const settings = animationSettings[tag.name] || {
//       driver: PositionUpdateType.Vel,
//       repeat: true,
//     };

//     if (settings.isAnim) {
//       const frames: AnimationFrame[] = [];

//       const direction = tag.name.match(/\-{1}([n, e, s, w, c])\-?/)?.at(1);
//       const xDirMultiplier = tag.name.includes("-w") ? -1 : 1;

//       for (let i = tag.from; i <= tag.to; i++) {
//         const frame = asepriteData.frames[`${tag.name}-${i - tag.from}`];

//         if (!frame)
//           throw new Error("Missing frame data for tag frame " + tag.name);

//         const frameData = frame.frame;
//         const duration = frame.duration;

//         // Add motion for animations that have predefined deltas for each animation frame

//         if (settings.driver === PositionUpdateType.DELTA) {
//           const isCruiseRamp = tag.name.startsWith("cruise-ramp");
//           const isCruiseBowl = tag.name.startsWith("cruise-bowl");
//           const isLandRamp = tag.name.startsWith("ramp-land");
//           const isJump = tag.name.startsWith("jump");

//           if (isCruiseRamp) {
//             const delta = Motions["cruise-ramp"][i - tag.from];
//             frames.push({
//               spritesheetX: frameData.x,
//               spritesheetY: frameData.y,
//               duration,
//               dx: delta.dx * xDirMultiplier,
//               dy: delta.dy,
//             });
//           } else if (isCruiseBowl) {
//             if (direction === "s" || direction === "n") {
//               const motion = Motions["cruise-bowl-" + direction];

//               for (const d of motion) {
//                 frames.push({
//                   spritesheetX: frameData.x,
//                   spritesheetY: frameData.y,
//                   duration,
//                   dx: d.dx,
//                   dy: d.dy,
//                 });
//               }
//             } else {
//               const delta = Motions[`cruise-bowl-h`][i - tag.from];
//               frames.push({
//                 spritesheetX: frameData.x,
//                 spritesheetY: frameData.y,
//                 duration,
//                 dx: delta.dx * xDirMultiplier,
//                 dy: delta.dy,
//               });
//             }
//           } else if (isLandRamp) {
//             for (const { dx, dy } of [{ dy: 0, dx: 0 * xDirMultiplier }]) {
//               frames.push({
//                 spritesheetX: frameData.x,
//                 spritesheetY: frameData.y,
//                 duration: 500,
//                 dx,
//                 dy,
//               });
//             }
//           } else if (isJump) {
//             if (direction === undefined)
//               throw new Error("No direction found in jump anim");
//             const upDown = tag.name.includes("up") ? "up" : "down";
//             const motion = Motions[`jump-${upDown}-${direction}`];

//             for (const d of motion) {
//               frames.push({
//                 spritesheetX: frameData.x,
//                 spritesheetY: frameData.y,
//                 duration,
//                 dx: d.dx,
//                 dy: d.dy,
//               });
//             }
//           } else {
//             const delta = Motions[tag.name][i - tag.from];

//             frames.push({
//               spritesheetX: frameData.x,
//               spritesheetY: frameData.y,
//               duration,
//               ...delta,
//             });
//           }
//         } else {
//           frames.push({
//             spritesheetX: frameData.x,
//             spritesheetY: frameData.y,
//             duration,
//           });
//         }
//       }

//       animations[tag.name] = {
//         positionUpdateType: settings.driver,
//         repeat: settings.repeat,
//         spritesheet: "skater",
//         frames,
//       };
//     } else {
//       const frames: { spritesheetX: number; spritesheetY: number }[] = [];

//       for (let i = tag.from; i <= tag.to; i++) {
//         const frame = asepriteData.frames[`${tag.name}-${i - tag.from}`];
//         if (!frame) throw new Error("Missing frame data for tag frame");
//         const frameData = frame.frame;
//         frames.push({
//           spritesheetX: frameData.x,
//           spritesheetY: frameData.y,
//         });
//       }

//       overlays[tag.name] = {
//         spritesheet: "skater",
//         frames,
//       };
//     }
//   }

//   return { animations, overlays };
// }
