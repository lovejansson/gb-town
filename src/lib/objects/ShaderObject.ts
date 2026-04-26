import ArtObject from "./ArtObject.js";
import type Scene from "../Scene.js";
import type { Vec2 } from "../types.ts";
import { type ContainerChild } from "pixi.js";

/**
 * 
 * Use ShaderObject class to create custom shader Graphics using Pixi's built in Graphics class. 
 * 
 * Implement 'getPixiChild' to make sure the correct geometry is added to the rendering. 
 * 
 */
export default abstract class ShaderObject extends ArtObject {
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

  abstract getPixiContainer(): ContainerChild;
}
