import ArtObject from "./ArtObject.js";
import type Scene from "../Scene.js";
import type { Vec2 } from "../types.ts";

export default class StaticImage extends ArtObject {
  image: string;

  constructor(
    scene: Scene,
    pos: Vec2,
    width: number,
    height: number,
    image: string,
  ) {
    super(scene, pos, width, height);
    this.image = image;
  }
}
