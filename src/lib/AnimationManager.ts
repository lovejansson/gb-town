import type { AnimatedSprite } from "pixi.js";
import type Sprite from "./objects/Sprite.ts";
import AnimationCanvasAdapter from "./AnimationCanvasAdapter.ts";
import type AnimationPixiAdapter from "./AnimationPixiAdapter.ts";

type AnimationPixiAdapterClass = new (sprite: Sprite) => AnimationPixiAdapter;
let _AnimationPixiAdapterClass: AnimationPixiAdapterClass | null = null;

export async function preloadPixiAnimationAdapter(): Promise<void> {
  const mod = await import("./AnimationPixiAdapter.ts");
  _AnimationPixiAdapterClass = mod.default;
}

export type AnimationOptions = {
  repeat?: number | boolean; // true = loop forever, number = fixed repeat count, false = play once
  overlay?: OverlayOptions;
};

export type OverlayOptions = {
  name: string;
  dx?: number;
  dy?: number;
  drawBehind?: boolean;
  drawOnTop?: boolean;
};

export type FrameChangeCallback = (
  animation: string,
  frame: number,
  totalFrames: number,
) => void;
export type LoopCallback = (animation: string, loopCount: number) => void;
export type CompleteCallback = (animation: string) => void;

export type AnimationOptionsDefaults = {
  defaults: Record<string, { repeat: number | boolean }>;
};

type Adapter = AnimationCanvasAdapter | AnimationPixiAdapter;

export default class AnimationManager {
  private adapter: Adapter;

  constructor(sprite: Sprite) {
    // Compare against string literal to avoid importing Art (which would create a circular dep)
    if (
      sprite.scene.getRenderMode() === "canvas" ||
      _AnimationPixiAdapterClass === null
    ) {
      this.adapter = new AnimationCanvasAdapter(sprite);
    } else {
      this.adapter = new _AnimationPixiAdapterClass(sprite);
    }
  }

  attachPixiSprites(main: AnimatedSprite, overlay: AnimatedSprite): void {
    if ("attachPixiSprites" in this.adapter) {
      (this.adapter as AnimationPixiAdapter).attachPixiSprites(main, overlay);
    }
  }


  registerSpritesheet(key: string, options?: AnimationOptionsDefaults): void {
    this.adapter.registerSpritesheet(key, options);
  }

  play(name: string, options?: AnimationOptions): void {
    this.adapter.play(name, options);
  }

  stop(name: string): void {
    this.adapter.stop(name);
  }

  getPlaying(): string | null {
    return this.adapter.currentAnimation;
  }

  isPlaying(name: string): boolean {
    return this.adapter.currentAnimation === name;
  }

  getEstimatedDistanceForAnim(
    name: string,
    vel: { x: number; y: number },
  ): { x: number; y: number } {
    const frameCount = this.adapter.getFrameCount(name);
    return { x: frameCount * vel.x, y: frameCount * vel.y };
  }

  isLastFrame(): boolean {
    return this.adapter.isLastFrame();
  }

  getFrameCount(name: string): number {
    return this.adapter.getFrameCount(name);
  }

  update(dt: number): void {
    this.adapter.update(dt);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    this.adapter.draw(ctx);
  }

  get currentAnimation(): string | null {
    return this.adapter.currentAnimation;
  }

  get loopCount(): number {
    return this.adapter.loopCount;
  }

  get onFrameChange(): FrameChangeCallback | null {
    return this.adapter.onFrameChange;
  }

  set onFrameChange(cb: FrameChangeCallback | null) {
    this.adapter.onFrameChange = cb;
  }

  get onLoop(): LoopCallback | null {
    return this.adapter.onLoop;
  }

  set onLoop(cb: LoopCallback | null) {
    this.adapter.onLoop = cb;
  }

  get onComplete(): CompleteCallback | null {
    return this.adapter.onComplete;
  }

  set onComplete(cb: CompleteCallback | null) {
    this.adapter.onComplete = cb;
  }
}
