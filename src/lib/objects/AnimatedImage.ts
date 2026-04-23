import ArtObject from "./ArtObject.ts";
import Scene from "../Scene.ts";
import type {  AsepriteFrame, AsepriteJSON } from "../types.ts";

export default class AnimatedImage extends ArtObject {
  image: string;
  frames: AsepriteFrame[];
  currentFrameIdx: number;
  elapsed: number;

  constructor(scene: Scene, spritesheet: string, config: AsepriteJSON) {
    super(scene);
    this.image = spritesheet;
    this.frames = Object.values(config.frames);
    this.currentFrameIdx = 0;
    this.elapsed = 0;
  }

  update(dt: number): void {
    const frame = this.frames[this.currentFrameIdx];

    this.elapsed += dt;

    if (this.elapsed >= frame.duration) {
      if (this.currentFrameIdx === this.frames.length - 1) {
        this.currentFrameIdx = 0;
      } else {
        this.currentFrameIdx++;
      }
      this.elapsed = 0;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const frame = this.frames[this.currentFrameIdx];
    if (this.scene.art === null)
      throw new Error("art is not set on scene object");
    const img = this.scene.art.images.get(this.image);

    if (!img) return;

    const { x, y, w, h } = frame.frame;
    ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
  }
}
