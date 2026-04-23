import { FrameObject, AnimatedSprite } from "pixi.js";
import type Sprite from "./objects/Sprite.js";
import type { Vec2 } from "./types.js";

export enum PositionUpdateType {
  Delta, // Animation updates to next frame after duration ms. Sprite's position is also updated according to dx and dy.
  Vel, // Animation updates to next frame after duration ms. Sprite's position is also updated according to sprite's velocity.
}

export type AnimationOptionsT<T extends PositionUpdateType> = {
  positionUpdateType: T;
  deltas: T extends PositionUpdateType.Delta
    ? { dx: number; dy: number }[]
    : undefined; // Deltas to update the Sprite's position with when frame changes
  repeat: number | boolean; // true loop infinitly, repeat a number of times or just one time
};

export type AnimationOptions =
  | AnimationOptionsT<PositionUpdateType.Delta>
  | AnimationOptionsT<PositionUpdateType.Vel>;

type AnimationConfigT<T extends PositionUpdateType> = AnimationOptionsT<T> & {
  frames: AnimationFrameT<T>[];
};

type AnimationFrameT<T extends PositionUpdateType> =
  T extends PositionUpdateType.Delta
    ? {
        delta: { dx: number; dy: number };
        texture: FrameObject;
      }
    : {
        texture: FrameObject;
      };

type AnimationFrame =
  | AnimationFrameT<PositionUpdateType.Delta>
  | AnimationFrameT<PositionUpdateType.Vel>;

export type OverlayOptions = {
  name: string;
  dx?: number;
  dy?: number;
  drawBehind?: boolean;
  drawOnTop?: boolean;
};

type PlayingAnimationT<T extends PositionUpdateType> = {
  positionUpdateType: T;
  name: string;
  config: AnimationConfigT<T>;

  loopCount: number;
  overlay?: OverlayOptions;
};

// TODO: create extra sprite for overlay to draw on top of the sprite when animating

type PlayingAnimation =
  | PlayingAnimationT<PositionUpdateType.Delta>
  | PlayingAnimationT<PositionUpdateType.Vel>;

type AnimationConfig =
  | AnimationConfigT<PositionUpdateType.Delta>
  | AnimationConfigT<PositionUpdateType.Vel>;

export default class AnimationManager {
  sprite: Sprite;
  animatedSprite: AnimatedSprite | null;
  animatedSpriteOverlay: AnimatedSprite | null;
  animations: Map<string, AnimationConfig>;
  overlays: Map<string, FrameObject[]>;
  playingAnimation: PlayingAnimation | null;

  constructor(sprite: Sprite) {
    this.sprite = sprite;
    this.animatedSprite = null;
    this.animatedSpriteOverlay = null;
    this.animations = new Map();
    this.overlays = new Map();
    this.playingAnimation = null;
  }

  createAnim(
    spritesheet: string,
    animation: string,
    options: AnimationOptions,
  ) {
    const s = this.sprite.scene.art!.spritesheets.get(spritesheet);

    switch (options.positionUpdateType) {
      case PositionUpdateType.Delta:
        const frames: AnimationFrameT<PositionUpdateType.Delta>[] =
          s.animations[animation].map((texture, idx) => ({
            texture: {
              texture,
              time: s.data.frames[texture.label!].duration,
            },
            delta: options.deltas[idx],
          }));

        this.animations.set(animation, { ...options, frames });
        break;
      case PositionUpdateType.Vel:
        {
          const frames: AnimationFrameT<PositionUpdateType.Vel>[] =
            s.animations[animation].map((texture, _) => ({
              texture: {
                texture,
                time: s.data.frames[texture.label!].duration,
              },
            }));

          this.animations.set(animation, { ...options, frames });
        }
        break;
    }
  }

  createOverlay(spritesheet: string, animation: string) {
    const s = this.sprite.scene.art!.spritesheets.get(spritesheet);

    const frames: FrameObject[] = s.animations[animation].map((texture, _) => ({
      texture,
      time: s.data.frames[texture.label!].duration,
    }));

    this.overlays.set(animation, frames);
  }

  getEstimatedDistanceForAnim(name: string, vel?: Vec2): Vec2 {
    const anim = this.animations.get(name);

    if (!anim) throw new AnimationNotAddedError(name);

    const dist = { x: 0, y: 0 };

    switch (anim.positionUpdateType) {
      case PositionUpdateType.Delta:
        if (anim.repeat === false) {
          for (const f of anim.frames) {
            dist.x += f.delta.dx;
            dist.y += f.delta.dy;
          }
        } else if (typeof anim.repeat === "number") {
          for (let i = 0; i < anim.repeat; ++i) {
            for (const f of anim.frames) {
              dist.x += f.delta.dx;
              dist.y += f.delta.dy;
            }
          }
        } else {
          dist.x = Infinity;
          dist.y = Infinity;

          for (const f of anim.frames) {
            dist.x += f.delta.dx;
            dist.y += f.delta.dy;
          }

          if (dist.x !== 0) {
            dist.x = Infinity * Math.sign(dist.x);
          }

          if (dist.y !== 0) {
            dist.y = Infinity * Math.sign(dist.y);
          }
        }

        break;
      case PositionUpdateType.Vel:
        for (let i = 0; i < anim.frames.length; ++i) {
          dist.x += vel?.x ?? 0;
          dist.y += vel?.y ?? 0;
        }
        break;
    }

    return dist;
  }

  play(name: string, overlay?: OverlayOptions) {
    const anim = this.animations.get(name);

    if (!anim) throw new AnimationNotAddedError(name);

    const animationOverlay =
      overlay !== undefined ? this.overlays.get(overlay.name) : undefined;

    switch (anim.positionUpdateType) {
      case PositionUpdateType.Delta:
        this.playingAnimation = {
          positionUpdateType: anim.positionUpdateType,
          name,
          config: anim,
          overlay:
            animationOverlay && overlay
              ? { ...animationOverlay, ...overlay }
              : undefined,
          loopCount: 0,
        };
        break;
      case PositionUpdateType.Vel:
        this.playingAnimation = {
          positionUpdateType: anim.positionUpdateType,
          name,
          config: anim,
          overlay:
            animationOverlay && overlay
              ? { ...animationOverlay, ...overlay }
              : undefined,
          loopCount: 0,
        };
        break;
    }

    if (this.playingAnimation.overlay) {
      if (this.animatedSpriteOverlay === null) {
        this.animatedSpriteOverlay = new AnimatedSprite(
          this.playingAnimation.overlay.frames,
          this.playingAnimation.config.repeat === true ? true : false,
        );
      } else {
        this.animatedSpriteOverlay.textures =
          this.playingAnimation.overlay.frames;
      }

      this.animatedSpriteOverlay.play();
    }

    if (this.animatedSprite === null) {
      this.animatedSprite = new AnimatedSprite(
        this.playingAnimation.config.frames.map((f) => f.texture),
        this.playingAnimation.config.repeat === true ? true : false,
      );
    } else {
      this.animatedSprite.textures = this.playingAnimation.config.frames.map(
        (f) => f.texture,
      );
    }

    this.animatedSprite.play();

    this.animatedSprite.onLoop = () => {
      this.playingAnimation!.loopCount++;
    };

    this.animatedSprite.onComplete = () => {
      if (typeof this.playingAnimation!.config.repeat === "number") {
        this.playingAnimation!.loopCount++;
        this.animatedSprite!.play();
        this.animatedSpriteOverlay?.play();
      }
    };

    // TODO: sync OVERLAY Animated sprite with main animated sprite

    this.animatedSprite.onFrameChange = (currFrame: number) => {
      switch (this.playingAnimation!.positionUpdateType) {
        case PositionUpdateType.Delta:
          const delta = this.playingAnimation?.config.frames[currFrame].delta!;
          this.animatedSprite.position.set(this.animatedSprite.) += delta.dx;
          this.animatedSprite.pos.y += delta.dy;
          break;
        case PositionUpdateType.Vel:
          this.animatedSprite.pos.x += this.animatedSprite.vel.x;
          this.animatedSprite.pos.y += this.animatedSprite.vel.y;
          break;
      }
    };
  }

  stop(name: string) {
    if (this.playingAnimation && name === this.playingAnimation.name) {
      this.playingAnimation = null;
    }
  }

  loopCount(): number {
    return this.playingAnimation?.loopCount ?? 0;
  }

  isPlaying(name: string): boolean {
    return this.playingAnimation?.name === name;
  }

  isLastFrame(): boolean {
    return (
      this.animatedSprite !== null &&
      this.animatedSprite.currentFrame === this.animatedSprite.totalFrames
    );
  }

  getPlaying(): string | null {
    return this.playingAnimation?.name ?? null;
  }
}

class AnimationNotAddedError extends Error {
  constructor(key: string) {
    super(`Animation: ${key} not added.`);
  }
}
