import AnimationManager from "../AnimationManager.js";
import ArtObject from "./ArtObject.ts";
import Scene from "../Scene.js";
import type { Vec2, Direction } from "../types.ts";
import { posToCell } from "../../utils.ts";

export default abstract class Sprite extends ArtObject {
  pos: Vec2;
  vel: Vec2;
  width: number;
  height: number;
  halfWidth: number;
  halfHeight: number;
  direction: Direction;
  animations: AnimationManager;

  constructor(
    scene: Scene,
    pos: Vec2,
    width: number,
    height: number,
    direction: Direction,
  ) {
    super(scene);
    this.pos = pos;
    this.vel = { x: 0, y: 0 };
    this.width = width;
    this.height = height;
    this.direction = direction;
    this.halfWidth = width / 2;
    this.halfHeight = height / 2;
    this.animations = new AnimationManager(this);
  }

  abstract update(dt: number): void;

  draw(ctx: CanvasRenderingContext2D): void {
    this.animations.draw(ctx);
  }

  getGridCell() {
    return posToCell(this.pos, this.scene.art!.tileSize);
  }

  isFacingEast(): boolean {
    return this.direction === "e";
  }

  isFacingWest(): boolean {
    return this.direction === "w";
  }
  isFacingNorth(): boolean {
    return this.direction === "n";
  }

  isFacingSouth(): boolean {
    return this.direction === "s";
  }
}
