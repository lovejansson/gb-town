import ArtObject from "./ArtObject.js";
import Scene from "../Scene.js";
import type { Vec2 } from "../types.ts";

export default class StaticObject extends ArtObject {
  pos: Vec2;
  width: number;
  height: number;
  halfWidth: number;
  halfHeight: number;

  constructor(
    scene: Scene,
    pos: Vec2,
    width: number,
    height: number,
  ) {
    super(scene);
    this.pos = pos;
    this.width = width;
    this.height = height;
    this.halfWidth = width / 2;
    this.halfHeight = height / 2;
  }
  
  draw(_: CanvasRenderingContext2D): void {
    // Don't have to draw anything since this is probably part of the tilemap already
  }
}
