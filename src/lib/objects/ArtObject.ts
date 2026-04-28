import { type ContainerChild } from "pixi.js";
import type Scene from "../Scene.ts";
import type { Vec2 } from "../types.ts";

export default abstract class ArtObject {
  id: number;
  scene: Scene;
  pos: Vec2;
  width: number;
  height: number;
  halfWidth: number;
  halfHeight: number;
 

  constructor(scene: Scene, pos: Vec2, width: number, height: number) {
    this.scene = scene;
    this.pos = pos;
    this.width = width;
    this.height = height;
    this.halfWidth = width / 2;
    this.halfHeight = height / 2;
    if (scene.art === null)
      throw new Error("art instance is not set on scene object");

    this.id = scene.art.getId();
  }

  update(_dt: number): void {}

  getPixiContainer?(): ContainerChild;
}
