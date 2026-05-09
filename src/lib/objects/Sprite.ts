import AnimationManager from "../AnimationManager.js";
import ArtObject from "./ArtObject.ts";
import type Scene from "../Scene.js";
import type { Vec2 } from "../types.ts";
import { posToCell } from "../utils.ts";

export default abstract class Sprite extends ArtObject {
  vel: Vec2;
  animations: AnimationManager;
  drawOffset: Vec2;

  constructor(
    scene: Scene,
    pos: Vec2,
    width: number,
    height: number,
  ) {
    super(scene, pos, width, height);

    this.vel = { x: 0, y: 0 };
    this.animations = new AnimationManager(this);
    this.drawOffset = { x: 0, y: 0 };
  }

  abstract update(dt: number): void;

  getGridCell() {
    return posToCell(this.pos, this.scene.art!.tileSize);
  }
}
