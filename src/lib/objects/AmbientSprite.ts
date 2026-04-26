import type Scene from "../Scene.ts";
import type { Vec2 } from "../types.ts";
import Sprite from "./Sprite.ts";

export default class AmbientSprite extends Sprite {
  private readonly spritesheet: string;
  private readonly animation: string;
  private started: boolean;

  constructor(
    scene: Scene,
    pos: Vec2,
    width: number,
    height: number,
    spritesheet: string,
    animation: string,
  ) {
    super(scene, pos, width, height, "e");
    this.spritesheet = spritesheet;
    this.animation = animation;
    this.started = false;
  }

  update(_dt: number): void {
    if (this.started) return;
    this.animations.registerSpritesheet(this.spritesheet);
    this.animations.play(this.animation, { repeat: true });
    this.started = true;
  }
}
