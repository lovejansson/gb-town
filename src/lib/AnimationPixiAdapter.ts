import { type FrameObject, AnimatedSprite, Spritesheet } from "pixi.js";
import type Sprite from "./objects/Sprite.ts";
import type {
  AnimationOptions,
  CompleteCallback,
  FrameChangeCallback,
  LoopCallback,
  RegisterSpritesheetOptions,
} from "./AnimationManager.ts";
import {type  PixiJSON } from "./SpritesheetsManager.ts";

export default class AnimationPixiAdapter {
  private sprite: Sprite;
  private animatedSprite: AnimatedSprite | null;
  private animatedSpriteOverlay: AnimatedSprite | null;
  private animations: Map<string, FrameObject[]>;
  private defaults: Map<string, { repeat: boolean | number }>;

  currentAnimation: string | null = null;
  loopCount: number = 0;
  onFrameChange: FrameChangeCallback | null = null;
  onLoop: LoopCallback | null = null;
  onComplete: CompleteCallback | null = null;

  constructor(sprite: Sprite) {
    this.sprite = sprite;
    this.animatedSprite = null;
    this.animatedSpriteOverlay = null;
    this.animations = new Map();
    this.defaults = new Map();
  }

  attachPixiSprites(main: AnimatedSprite, overlay: AnimatedSprite): void {
    this.animatedSprite = main;
    this.animatedSpriteOverlay = overlay;
  }

  registerSpritesheet(
    key: string,
    options?: RegisterSpritesheetOptions,
  ): void {
    const normalized = options ?? {};
    const s = this.sprite.scene.art!.spritesheets.get(key) as Spritesheet<PixiJSON>;

    for (const [name, textures] of Object.entries(s.animations)) {
      this.animations.set(
        name,
        textures.map((texture) => ({
          texture,
          time: s.data.frames[texture.label!].duration,
        })),
      );

      if (normalized.defaults?.[name] !== undefined) {
        this.defaults.set(name, normalized.defaults[name]);
      }
    }
  }

  play(name: string, options?: AnimationOptions): void {
    const anim = this.animations.get(name);
    if (!anim) throw new AnimationNotAddedError(name);

    const animOverlay =
      options?.overlay !== undefined
        ? this.animations.get(options.overlay.name)
        : undefined;

    const repeat = options?.repeat ?? this.defaults.get(name)?.repeat ?? false;

    if (this.animatedSprite === null) {
      throw new Error(
        `AnimatedSprite not initialized for "${name}". Add sprite to scene before calling play().`,
      );
    }

    this.currentAnimation = name;
    this.loopCount = 0;

    this.animatedSprite.textures = anim;
    this.animatedSprite.loop = repeat === true;
    this.animatedSprite.visible = true;
    this.animatedSprite.play();

    if (animOverlay !== undefined && this.animatedSpriteOverlay !== null) {
      this.animatedSpriteOverlay.textures = animOverlay;
      this.animatedSpriteOverlay.visible = true;
      this.animatedSpriteOverlay.gotoAndStop(0);
    }

    if (this.animatedSpriteOverlay !== null && options?.overlay?.drawBehind) {
      this.sprite.scene.addPixiChild(this.animatedSpriteOverlay);
    }

    this.sprite.scene.addPixiChild(this.animatedSprite);

    if (this.animatedSpriteOverlay !== null && options?.overlay?.drawOnTop) {
      this.sprite.scene.addPixiChild(this.animatedSpriteOverlay);
    }

    this.animatedSprite.onLoop = () => {
      if (this.animatedSprite === null || this.currentAnimation === null) return;
      this.loopCount++;
      if (this.onLoop) this.onLoop(this.currentAnimation, this.loopCount);

      if (this.animatedSprite.totalFrames === 1 && this.onFrameChange) {
        this.onFrameChange(this.currentAnimation, 0, this.animatedSprite.totalFrames);
      }
    };

    this.animatedSprite.onComplete = () => {
      if (this.animatedSprite === null || this.currentAnimation === null) return;

      if (typeof repeat === "number") {
        this.loopCount++;

        if (this.loopCount === repeat) {
          if (this.onComplete) this.onComplete(this.currentAnimation);
        } else {
          this.animatedSprite.play();
          if (this.animatedSpriteOverlay !== null) {
            this.animatedSpriteOverlay.gotoAndStop(0);
          }
          if (this.onFrameChange) {
            this.onFrameChange(
              this.currentAnimation,
              0,
              this.animatedSprite.totalFrames,
            );
          }
        }
      } else {
        if (this.onComplete) this.onComplete(this.currentAnimation);
      }
    };

    this.animatedSprite.onFrameChange = (currFrame: number) => {
      if (this.currentAnimation === null || this.animatedSprite === null) return;

      if (this.onFrameChange) {
        this.onFrameChange(
          this.currentAnimation,
          currFrame,
          this.animatedSprite.totalFrames,
        );
      }

      this.animatedSprite.position.set(this.sprite.pos.x, this.sprite.pos.y);

      if (this.animatedSpriteOverlay !== null) {
        this.animatedSpriteOverlay.position.set(
          this.sprite.pos.x + (options?.overlay?.dx ?? 0),
          this.sprite.pos.y + (options?.overlay?.dy ?? 0),
        );

        if (this.animatedSpriteOverlay.visible) {
          const mainTotal = Math.max(this.animatedSprite.totalFrames, 1);
          const overlayTotal = Math.max(this.animatedSpriteOverlay.totalFrames, 1);
          const progress = mainTotal <= 1 ? 0 : currFrame / (mainTotal - 1);
          const overlayFrame = Math.min(
            overlayTotal - 1,
            Math.max(0, Math.round(progress * (overlayTotal - 1))),
          );
          this.animatedSpriteOverlay.gotoAndStop(overlayFrame);
        }
      }
    };

    if (this.onFrameChange) {
      this.onFrameChange(name, 0, this.animatedSprite.totalFrames);
    }
  }

  stop(name: string): void {
    if (this.animatedSprite !== null && name === this.currentAnimation) {
      this.animatedSprite.stop();
      if (this.animatedSpriteOverlay !== null) {
        this.animatedSpriteOverlay.stop();
      }
    }
  }

  // No-ops — Pixi drives its own timing via AnimatedSprite
  update(_dt: number): void {}
  draw(_ctx: CanvasRenderingContext2D): void {}

  isLastFrame(): boolean {
    return (
      this.animatedSprite !== null &&
      this.animatedSprite.currentFrame === this.animatedSprite.totalFrames
    );
  }

  getFrameCount(name: string): number {
    return this.animations.get(name)?.length ?? 0;
  }
}

class AnimationNotAddedError extends Error {
  constructor(name: string) {
    super(`Animation: ${name} not added.`);
  }
}
