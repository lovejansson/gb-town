import { getRandomFreeCell } from "../grid";
import { Scene, StaticImage } from "../lib";
import type { Vec2 } from "../lib/types";
import type Play from "../Play";
import { cellToPos, randomEl } from "../utils";

export type ObstacleType = "flat" | "ramp";

export const obstacles: ObstacleType[] = ["flat", "ramp"];

export const tricks: Trick[] = [
  "ollie",
  "pop-shove-it",
  "kickflip",
  "50-50-grind",
  "5-0-grind",
  "nose-grind",
  "grab",
  "180",
  "360-shove-it",
  "360",
];

export type Trick =
  | "ollie"
  | "pop-shove-it"
  | "kickflip"
  | "50-50-grind"
  | "5-0-grind"
  | "nose-grind"
  | "grab"
  | "180"
  | "360-shove-it"
  | "360";

export const obstacleTricks: { [k in ObstacleType]: Trick[] } = {
  flat: ["ollie", "pop-shove-it", "kickflip", "360-shove-it"],
  ramp: ["180", "360", "grab"],
};

export default class Obstacle extends StaticImage {
  readonly type: ObstacleType;
  private queue: number[];
  private isFree: boolean;
  private numSkatersLimit: number;
  protected skaters: number[];
  private currSkater: number | null;
  protected tileSize: number;

  constructor(
    scene: Scene,
    type: ObstacleType,
    pos: Vec2,
    width: number,
    height: number,
    image: string,
    numSkatersLimit: number,
  ) {
    super(scene, pos, width, height, image);
    this.type = type;
    this.queue = [];
    this.isFree = true;
    this.currSkater = null;
    this.skaters = [];
    this.numSkatersLimit = numSkatersLimit;
    this.tileSize = this.scene.art!.tileSize;
  }

  isStartOnGround() {
    return this.type !== "ramp";
  }

  getArrivePos(_: Vec2): Vec2 {
    return { x: this.pos.x - this.tileSize, y: this.pos.y - this.tileSize };
  }

  isOccupiedByMe(id: number): boolean {
    return this.currSkater === id;
  }

  isMyTurn(id: number): boolean {
    return this.isFree && this.queue[0] === id;
  }

  isStandingInLine(id: number) {
    return this.queue.find((i) => i === id) !== undefined;
  }

  /**
   * Call this when skater should occupy the obsticle, it will remove the skater from the queue and set the obsticle to not free.
   */
  skate(id: number) {
    if (!this.isMyTurn(id)) throw new Error("Wait for your turn mr");

    this.currSkater = this.queue.shift()!;

    this.isFree = false;
  }

  /**
   * When skater is done with their round of tricks they end the skate.
   * If they want to reenter the queue they have to do so manually.
   */
  endSkate(id: number) {
    if (this.currSkater !== id)
      throw new Error("Skater is not skating the obstacle.");

    this.currSkater = null;

    this.isFree = true;
  }

  leave(id: number) {
    const skaterIdx = this.skaters.findIndex((s) => s === id);

    if (skaterIdx === -1) throw new Error("Skater is not at obstacle.");

    this.skaters.splice(skaterIdx, 1);

    const qi = this.queue.findIndex((i) => i === id);

    if (qi !== -1) this.queue.splice(qi, 1);
  }

  /**
   * When skater has arrived they can stand in line to go skate the obsticle.
   */
  standInLine(id: number): void {
    this.assertSkaterIsAtObstacle(id);

    if (this.queue.find((i) => i === id))
      throw new Error("Skater is already in line");

    this.queue.push(id);
  }

  /**
   * Skater needs to arrive to get an idle position at the obsticle.
   */
  arrive(id: number): void {
    if (this.isTooCrowded()) throw new Error("Obstacle is too crowded");
    this.skaters.push(id);
  }

  isTooCrowded(): boolean {
    return this.skaters.length === this.numSkatersLimit;
  }

  protected assertSkaterIsAtObstacle(id: number): number {
    const skater = this.skaters.find((s) => s === id);

    if (skater === undefined) throw new Error("Skater is not at obstacle.");

    return skater;
  }
}

export const BEHIND_RAMP_OFFSET = 3;

export class Ramp extends Obstacle {
  private idlePositions: {
    pos: Vec2;
    isFree: boolean;
  }[];

  private skaterIdlePositions: Map<number, number>;

  constructor(scene: Scene, pos: Vec2, width: number, height: number) {
    super(scene, "ramp", pos, width, height, "ramp", 4);
    
    this.idlePositions = [
      { pos: { x: this.pos.x, y: this.pos.y + this.tileSize }, isFree: true },
      {
        pos: { x: this.pos.x, y: this.pos.y + this.height - this.tileSize * 3 },
        isFree: true,
      },
      {
        pos: {
          x: this.pos.x + this.width - this.tileSize,
          y: this.pos.y + this.tileSize,
        },
        isFree: true,
      },
      {
        pos: {
          x: this.pos.x + this.width - this.tileSize,
          y: this.pos.y + this.height - this.tileSize * 3,
        },
        isFree: true,
      },
    ];

    this.skaterIdlePositions = new Map();
  }

  skate(id: number): void {
    super.skate(id);

    this.returnIdlePos(id);

    this.getNewIdlePos(id);
  }

  arrive(id: number): Vec2 {
    super.arrive(id);

    const idlePosIdx = this.getNewIdlePos(id);

    return this.idlePositions[idlePosIdx].pos;
  }

  leave(id: number): void {
    super.leave(id);

    this.returnIdlePos(id);
  }

  getMyIdlePos(id: number): Vec2 {
    const skater = this.skaters.find((s) => s === id);

    if (skater === undefined) throw new Error("Skater is not at obstacle.");

    const idlePosIdx = this.skaterIdlePositions.get(id);

    if (idlePosIdx === undefined)
      throw new Error("Skater has no idle pos idx assigned to them.");

    const idlePos = this.idlePositions.at(idlePosIdx);

    if (idlePos === undefined) throw new Error("Idle position not found.");

    return idlePos.pos;
  }

  getIdlePosSide(id: number): RampSide {
    const idlePos = this.getMyIdlePos(id);
    const centerX = this.pos.x + this.halfWidth;
    const centerY = this.pos.y + this.halfHeight;

    if (idlePos.x < centerX && idlePos.y < centerY) {
      return RampSide.TOP_LEFT;
    } else if (idlePos.x < centerX && idlePos.y > centerY) {
      return RampSide.BOTTOM_LEFT;
    } else if (idlePos.x > centerX && idlePos.y > centerY) {
      return RampSide.BOTTOM_RIGHT;
    } else if (idlePos.x > centerX && idlePos.y < centerY) {
      return RampSide.TOP_RIGHT;
    }

    throw new Error("internal error");
  }

  private returnIdlePos(id: number): void {
    super.assertSkaterIsAtObstacle(id);

    const idlePosIdx = this.skaterIdlePositions.get(id);

    if (idlePosIdx === undefined)
      throw new Error("Skater has no idle pos idx assigned to them.");

    this.idlePositions[idlePosIdx].isFree = true;
  }

  private getNewIdlePos(id: number): number {
    super.assertSkaterIsAtObstacle(id);

    const idlePosIdx = (() => {
      const indices: number[] = [];

      for (let i = 0; i < this.idlePositions.length; ++i) {
        if (this.idlePositions[i].isFree) {
          indices.push(i);
        }
      }
      return randomEl(indices);
    })();

    if (idlePosIdx === null) throw new Error("No free idle positions found");

    this.idlePositions[idlePosIdx].isFree = false;

    this.skaterIdlePositions.set(id, idlePosIdx);

    return idlePosIdx;
  }

  getArrivePos(idlePos: Vec2): Vec2 {
    const centerY = this.pos.y + this.halfHeight;

    return {
      x: idlePos.x,
      y:
        idlePos.y < centerY
          ? this.pos.y + (BEHIND_RAMP_OFFSET - 1) * this.tileSize
          : this.pos.y + this.height,
    };
  }
}

export enum RampSide {
  TOP_LEFT = "top-left",
  TOP_RIGHT = "top-right",
  BOTTOM_RIGHT = "bottom-right",
  BOTTOM_LEFT = "bottom-left",
}

export class Flat extends Obstacle {
  constructor(scene: Scene, pos: Vec2, width: number, height: number) {
    super(scene, "flat", pos, width, height, "flat", 4);
  }

  getArrivePos(_: Vec2): Vec2 {
    const cell = getRandomFreeCell((this.scene as Play).parkGrid);

    if (cell === null) throw new Error("No free cell found!");

    return cellToPos(cell, this.tileSize);
  }
}
