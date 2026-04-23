import { Scene, Sprite } from "./lib";
import {
  PositionUpdateType,
  type AnimationOptions,
  type AnimationConfigT,
  type AnimationFrame,
  type AnimationOverlay,
} from "./lib/AnimationManager";
import type { Direction, Vec2 } from "./lib/types";
import spritesheetJSON from "./skater-spritesheet.json";
import { type AsepriteJSON } from "./lib/index";

const spritesheet = spritesheetJSON as unknown as AsepriteJSON;


/**
 * 
 * En karaktär behöver ha en animated sprite i sig som sköter animeringarna, detta borde vara inbyggt i AnimationManager 
som får skapa upp pixie animeringar istället
 * 
 * 
 * 
 * 
 */

export default class Human extends Sprite {
  static CRUISE_SPEED = 4;
  static GRIND_SPEED = 4;
  static TRICK_SPEED = 4;
  static WALK_SPEED = 1;


  tileSize: number;

  constructor(
    scene: Scene,
    pos: Vec2,
  ) {
    super(scene, pos, 16, 32, "s");

    this.tileSize = scene.art!.tileSize;

    const { animations, overlays } = createAnimationsFromAseprite(
      spritesheet,
      AnimationSettings,
    );

    for (const [name, anim] of Object.entries(animations)) {
      this.animations.createAnim(name, anim as AnimationOptions);
    }

    console.dir(animations);
    for (const [name, overlay] of Object.entries(overlays)) {
      this.animations.createOverlay(name, overlay);
    }

  }


  update(dt: number): void {
    this.animations.update(dt);
  }
}

/**
 * Animation integration
 *
 * The exported Aseprite JSON file is used to create the animations. It contains a list of tag names which refers to an animation and contains references to which frames are used in that animation.
 *
 * - Each frame has data duration and spritesheet position x,y among other attributes.
 *
 * - The AnimationsSettings is a lookup record for the settings of each animation that are used by the AnimationManager. Each key maps to a tag name in the Aseprite JSON file.
 *
 * - Motions is another lookup record for motion series that is used by the animations with animation driver type Distance.
 *
 */

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

const AnimationSettings: Record<
  string,
  | { driver: PositionUpdateType; repeat: number | boolean; isAnim: true }
  | { isAnim: false }
> = {
  // Time-driven animations, repeating
  "walk-n": {
    driver: PositionUpdateType.Vel,
    repeat: true,
    isAnim: true,
  },
  "walk-s": {
    driver: PositionUpdateType.Vel,
    repeat: true,
    isAnim: true,
  },

  "walk-e": {
    driver: PositionUpdateType.Vel,
    repeat: true,
    isAnim: true,
  },
  "walk-w": {
    driver: PositionUpdateType.Vel,
    repeat: true,
    isAnim: true,
  },
  "walk-board-n": {
    driver: PositionUpdateType.Vel,
    repeat: true,
    isAnim: true,
  },
  "walk-board-s": {
    driver: PositionUpdateType.Vel,
    repeat: true,
    isAnim: true,
  },
  "walk-board-e": {
    driver: PositionUpdateType.Vel,
    repeat: true,
    isAnim: true,
  },
  "walk-board-w": {
    driver: PositionUpdateType.Vel,
    repeat: true,
    isAnim: true,
  },
  "idle-sit-n": {
    driver: PositionUpdateType.Vel,
    repeat: true,
    isAnim: true,
  },
  "idle-sit-s": {
    driver: PositionUpdateType.Vel,
    repeat: true,
    isAnim: true,
  },
  "idle-stand-n": {
    driver: PositionUpdateType.Vel,
    repeat: true,
    isAnim: true,
  },
  "idle-stand-s": {
    driver: PositionUpdateType.Vel,
    repeat: true,
    isAnim: true,
  },
  "idle-stand-w": {
    driver: PositionUpdateType.Vel,
    repeat: true,
    isAnim: true,
  },
  "idle-stand-e": {
    driver: PositionUpdateType.Vel,
    repeat: true,
    isAnim: true,
  },

  "idle-stand-board-n": {
    driver: PositionUpdateType.Vel,
    repeat: true,
    isAnim: true,
  },
  "idle-stand-board-s": {
    driver: PositionUpdateType.Vel,
    repeat: true,
    isAnim: true,
  },

  "prep-n": {
    driver: PositionUpdateType.Vel,
    repeat: false,
    isAnim: true,
  },

  "prep-s": {
    driver: PositionUpdateType.Vel,
    repeat: false,
    isAnim: true,
  },

  "flip-n": { driver: PositionUpdateType.Vel, repeat: false, isAnim: true },
  "flip-s": { driver: PositionUpdateType.Vel, repeat: false, isAnim: true },
  "flip-w": { driver: PositionUpdateType.Vel, repeat: false, isAnim: true },
  "flip-e": { driver: PositionUpdateType.Vel, repeat: false, isAnim: true },

  // Time-driven animations, no repeat
  "180-f": { driver: PositionUpdateType.Vel, repeat: false, isAnim: true },
  "180-b": { driver: PositionUpdateType.Vel, repeat: false, isAnim: true },
  "360-f": { driver: PositionUpdateType.Vel, repeat: false, isAnim: true },
  "360-b": { driver: PositionUpdateType.Vel, repeat: false, isAnim: true },

  "180-e-cw": { driver: PositionUpdateType.Vel, repeat: false, isAnim: true },
  "180-e-ccw": { driver: PositionUpdateType.Vel, repeat: false, isAnim: true },
  "180-w-cw": { driver: PositionUpdateType.Vel, repeat: false, isAnim: true },
  "180-w-ccw": { driver: PositionUpdateType.Vel, repeat: false, isAnim: true },
  "360-e-cw": { driver: PositionUpdateType.Vel, repeat: false, isAnim: true },
  "360-e-ccw": { driver: PositionUpdateType.Vel, repeat: false, isAnim: true },
  "360-w-cw": { driver: PositionUpdateType.Vel, repeat: false, isAnim: true },
  "360-w-ccw": { driver: PositionUpdateType.Vel, repeat: false, isAnim: true },

  "grab-f": { driver: PositionUpdateType.Vel, repeat: false, isAnim: true },
  "grab-b": { driver: PositionUpdateType.Vel, repeat: false, isAnim: true },
  "grab-w": { driver: PositionUpdateType.Vel, repeat: false, isAnim: true },
  "grab-e": { driver: PositionUpdateType.Vel, repeat: false, isAnim: true },
  "kickflip-f": {
    driver: PositionUpdateType.Vel,
    repeat: false,
    isAnim: true,
  },
  "kickflip-b": {
    driver: PositionUpdateType.Vel,
    repeat: false,
    isAnim: true,
  },
  "shove-it-f": {
    driver: PositionUpdateType.Vel,
    repeat: false,
    isAnim: true,
  },
  "shove-it-b": {
    driver: PositionUpdateType.Vel,
    repeat: false,
    isAnim: true,
  },
  "ollie-f": {
    driver: PositionUpdateType.Vel,
    repeat: false,
    isAnim: true,
  },
  "ollie-b": {
    driver: PositionUpdateType.Vel,
    repeat: false,
    isAnim: true,
  },
  "nose-grind-f-w": {
    driver: PositionUpdateType.Vel,
    repeat: true,
    isAnim: true,
  },
  "nose-grind-b-w": {
    driver: PositionUpdateType.Vel,
    repeat: true,
    isAnim: true,
  },
  "nose-grind-f-e": {
    driver: PositionUpdateType.Vel,
    repeat: true,
    isAnim: true,
  },
  "nose-grind-b-e": {
    driver: PositionUpdateType.Vel,
    repeat: true,
    isAnim: true,
  },

  "cruise-n": {
    driver: PositionUpdateType.Vel,
    repeat: true,
    isAnim: true,
  },
  "cruise-s": {
    driver: PositionUpdateType.Vel,
    repeat: true,
    isAnim: true,
  },

  "cruise-f-e": {
    driver: PositionUpdateType.Vel,
    repeat: true,
    isAnim: true,
  },
  "cruise-f-w": {
    driver: PositionUpdateType.Vel,
    repeat: true,
    isAnim: true,
  },
  "cruise-b-e": {
    driver: PositionUpdateType.Vel,
    repeat: true,
    isAnim: true,
  },
  "cruise-b-w": {
    driver: PositionUpdateType.Vel,
    repeat: true,
    isAnim: true,
  },

  "cruise-ramp-f-e": {
    driver: PositionUpdateType.Delta,
    repeat: false,
    isAnim: true,
  },
  "cruise-ramp-f-w": {
    driver: PositionUpdateType.Delta,
    repeat: false,
    isAnim: true,
  },
  "cruise-ramp-b-e": {
    driver: PositionUpdateType.Delta,
    repeat: false,
    isAnim: true,
  },
  "cruise-ramp-b-w": {
    driver: PositionUpdateType.Delta,
    repeat: false,
    isAnim: true,
  },

  "cruise-bowl-f-e": {
    driver: PositionUpdateType.Delta,
    repeat: false,
    isAnim: true,
  },
  "cruise-bowl-f-w": {
    driver: PositionUpdateType.Delta,
    repeat: false,
    isAnim: true,
  },
  "cruise-bowl-b-e": {
    driver: PositionUpdateType.Delta,
    repeat: false,
    isAnim: true,
  },
  "cruise-bowl-b-w": {
    driver: PositionUpdateType.Delta,
    repeat: false,
    isAnim: true,
  },

  "cruise-bowl-s-w": {
    driver: PositionUpdateType.Delta,
    repeat: false,
    isAnim: true,
  },
  "cruise-bowl-n-w": {
    driver: PositionUpdateType.Delta,
    repeat: false,
    isAnim: true,
  },

  "cruise-bowl-s-e": {
    driver: PositionUpdateType.Delta,
    repeat: false,
    isAnim: true,
  },
  "cruise-bowl-n-e": {
    driver: PositionUpdateType.Delta,
    repeat: false,
    isAnim: true,
  },

  "jump-up-f-w": {
    driver: PositionUpdateType.Delta,
    repeat: false,
    isAnim: true,
  },

  "jump-up-b-w": {
    driver: PositionUpdateType.Delta,
    repeat: false,
    isAnim: true,
  },

  "jump-up-f-e": {
    driver: PositionUpdateType.Delta,
    repeat: false,
    isAnim: true,
  },

  "jump-up-b-e": {
    driver: PositionUpdateType.Delta,
    repeat: false,
    isAnim: true,
  },

  "jump-down-f-w": {
    driver: PositionUpdateType.Delta,
    repeat: false,
    isAnim: true,
  },

  "jump-down-b-w": {
    driver: PositionUpdateType.Delta,
    repeat: false,
    isAnim: true,
  },

  "jump-down-f-e": {
    driver: PositionUpdateType.Delta,
    repeat: false,
    isAnim: true,
  },

  "jump-down-b-e": {
    driver: PositionUpdateType.Delta,
    repeat: false,
    isAnim: true,
  },

  "ramp-land-w": {
    driver: PositionUpdateType.Delta,
    repeat: false,
    isAnim: true,
  },
  "ramp-land-e": {
    driver: PositionUpdateType.Delta,
    repeat: false,
    isAnim: true,
  },

  // Time + movement sync
  "climb-up": {
    driver: PositionUpdateType.Vel,
    repeat: true,
    isAnim: true,
  },
  "climb-down": {
    driver: PositionUpdateType.Vel,
    repeat: true,
    isAnim: true,
  },

  // Overlays, overlays follow their parent animation's settings

  "board-carry-r": { isAnim: false },
  "board-carry-l": { isAnim: false },
  "board-carry-c": { isAnim: false },

  "board-carry-idle-r": { isAnim: false },
  "board-carry-idle-l": { isAnim: false },
  "board-carry-idle-c": { isAnim: false },

  "flip-board-n": { isAnim: false },
  "flip-board-e": { isAnim: false },
  "flip-board-s": { isAnim: false },
  "flip-board-w": { isAnim: false },
};

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

function createAnimationsFromAseprite(
  asepriteData: AsepriteJSON,
  animationSettings: Record<
    string,
    | { driver: PositionUpdateType; repeat: number | boolean; isAnim: true }
    | { isAnim: false }
  >,
): {
  animations: Record<string, AnimationConfigT<PositionUpdateType>>;
  overlays: Record<string, AnimationOverlay>;
} {
  const animations: Record<string, AnimationConfigT<PositionUpdateType>> = {};
  const overlays: Record<string, AnimationOverlay> = {};

  for (const tag of asepriteData.meta.frameTags) {
    const settings = animationSettings[tag.name] || {
      driver: PositionUpdateType.Vel,
      repeat: true,
    };

    if (settings.isAnim) {
      const frames: AnimationFrame[] = [];

      const direction = tag.name.match(/\-{1}([n, e, s, w, c])\-?/)?.at(1);
      const xDirMultiplier = tag.name.includes("-w") ? -1 : 1;

      for (let i = tag.from; i <= tag.to; i++) {
        const frame = asepriteData.frames[`${tag.name}-${i - tag.from}`];

        if (!frame)
          throw new Error("Missing frame data for tag frame " + tag.name);

        const frameData = frame.frame;
        const duration = frame.duration;

        // Add motion for animations that have predefined deltas for each animation frame

        if (settings.driver === PositionUpdateType.Delta) {
          const isCruiseRamp = tag.name.startsWith("cruise-ramp");
          const isCruiseBowl = tag.name.startsWith("cruise-bowl");
          const isLandRamp = tag.name.startsWith("ramp-land");
          const isJump = tag.name.startsWith("jump");

          if (isCruiseRamp) {
            const delta = Motions["cruise-ramp"][i - tag.from];
            frames.push({
              spritesheetX: frameData.x,
              spritesheetY: frameData.y,
              duration,
              dx: delta.dx * xDirMultiplier,
              dy: delta.dy,
            });
          } else if (isCruiseBowl) {
            if (direction === "s" || direction === "n") {
              const motion = Motions["cruise-bowl-" + direction];

              for (const d of motion) {
                frames.push({
                  spritesheetX: frameData.x,
                  spritesheetY: frameData.y,
                  duration,
                  dx: d.dx,
                  dy: d.dy,
                });
              }
            } else {
              const delta = Motions[`cruise-bowl-h`][i - tag.from];
              frames.push({
                spritesheetX: frameData.x,
                spritesheetY: frameData.y,
                duration,
                dx: delta.dx * xDirMultiplier,
                dy: delta.dy,
              });
            }
          } else if (isLandRamp) {
            for (const { dx, dy } of [{ dy: 0, dx: 0 * xDirMultiplier }]) {
              frames.push({
                spritesheetX: frameData.x,
                spritesheetY: frameData.y,
                duration: 500,
                dx,
                dy,
              });
            }
          } else if (isJump) {
            if (direction === undefined)
              throw new Error("No direction found in jump anim");
            const upDown = tag.name.includes("up") ? "up" : "down";
            const motion = Motions[`jump-${upDown}-${direction}`];

            for (const d of motion) {
              frames.push({
                spritesheetX: frameData.x,
                spritesheetY: frameData.y,
                duration,
                dx: d.dx,
                dy: d.dy,
              });
            }
          } else {
            const delta = Motions[tag.name][i - tag.from];

            frames.push({
              spritesheetX: frameData.x,
              spritesheetY: frameData.y,
              duration,
              ...delta,
            });
          }
        } else {
          frames.push({
            spritesheetX: frameData.x,
            spritesheetY: frameData.y,
            duration,
          });
        }
      }

      animations[tag.name] = {
        positionUpdateType: settings.driver,
        repeat: settings.repeat,
        spritesheet: "skater",
        frames,
      };
    } else {
      const frames: { spritesheetX: number; spritesheetY: number }[] = [];

      for (let i = tag.from; i <= tag.to; i++) {
        const frame = asepriteData.frames[`${tag.name}-${i - tag.from}`];
        if (!frame) throw new Error("Missing frame data for tag frame");
        const frameData = frame.frame;
        frames.push({
          spritesheetX: frameData.x,
          spritesheetY: frameData.y,
        });
      }

      overlays[tag.name] = {
        spritesheet: "skater",
        frames,
      };
    }
  }

  return { animations, overlays };
}
