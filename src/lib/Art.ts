import AudioPlayer from "./AudioPlayer.ts";
import Scene from "./Scene.ts";
import TexturesManager from "./TexturesManager.ts";
import SpritesheetsManager, {
 type PixiJSON,
 type SpritesheetCanvas,
} from "./SpritesheetsManager.ts";
import ImagesManager from "./ImagesManager.ts";
import type { Spritesheet as PixiSpritesheet } from "pixi.js";
import { preloadPixiClasses } from "./Scene.ts";
import { preloadPixiAnimationAdapter } from "./AnimationManager.ts";
import SpritesheetCanvasAdapter from "./SpritesheetCanvasAdapter.ts";
import Renderer, { CanvasRenderer } from "./Renderer.ts";

export enum RenderMode {
  CANVAS = "canvas",
  PIXI = "pixi",
}

export type ArtConfig<T extends RenderMode> = {
  width: number;
  height: number;
  tileSize: number;
  play: Scene;
  pause: Scene;
  container?: string;
  displayGrid: boolean;
  gridColor?: string;
  services?: Record<string, any>;
  mode: T;
  scale?: "hd" | "4k" | null;
};

type Spritesheet<T extends RenderMode> = T extends RenderMode.CANVAS
  ? SpritesheetCanvas
  : PixiSpritesheet<PixiJSON>;

const CONTAINER_SELECTOR_DEFAULT = "#art-container";

export default class Art<T extends RenderMode> {
  keys: {
    up: boolean;
    right: boolean;
    down: boolean;
    left: boolean;
    space: boolean;
  };

  textures: TexturesManager;
  spritesheets!: SpritesheetsManager<Spritesheet<T>>;
  images: ImagesManager;
  audio: AudioPlayer;
  services: Record<string, any> | null;

  width: number;
  height: number;
  tileSize: number;
  displayGrid: boolean;
  gridColor: string;
  scale: "hd" | "4k" | null;

  isPlaying: boolean;

  private config: ArtConfig<T>;
  private startTime: Date | null;
  private currId: number;
  private renderer!: Renderer;

constructor(config: ArtConfig<T>) {
    this.images = new ImagesManager();
    this.textures = new TexturesManager();

    if (config.mode === RenderMode.CANVAS) {
      this.renderer = new Renderer(
        new CanvasRenderer(
          this as Art<RenderMode.CANVAS>,
          config as ArtConfig<RenderMode.CANVAS>,
        ),
      );
      this.spritesheets = new SpritesheetsManager(
        new SpritesheetCanvasAdapter(),
      ) as SpritesheetsManager<Spritesheet<T>>;
    }
    // Pixi mode: renderer and spritesheets are set in init()

    this.audio = new AudioPlayer();

    this.isPlaying = false;

    this.config = config;
    this.width = config.width;
    this.height = config.height;
    this.tileSize = config.tileSize;
    this.displayGrid = config.displayGrid ?? false;
    this.gridColor = config.gridColor ?? "white";
    this.scale = config.scale ?? null;
    this.services = config.services ?? null;

    this.keys = {
      up: false,
      right: false,
      down: false,
      left: false,
      space: false,
    };

    this.startTime = null;
    this.currId = -1;
  }

  enterFullScreen(): void {
    const body = document.querySelector("body");
    if (!body) throw new Error("body not found");

    if (!document.fullscreenElement) {
      body.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  getId(): number {
    this.currId++;
    return this.currId;
  }

  async init(): Promise<void> {
    // Lazily load pixi deps here since constructor can't be async
    
    if (this.config.mode === RenderMode.PIXI) {
      const [rendererMod, spritesheetMod] = await Promise.all([
        import("./PixiRenderer.ts"),
        import("./SpritesheetPixiAdapter.ts"),
        preloadPixiClasses(),
        preloadPixiAnimationAdapter(),
      ]);
      this.renderer = new Renderer(
        new rendererMod.PixiRenderer(
          this as Art<RenderMode.PIXI>,
          this.config as ArtConfig<RenderMode.PIXI>,
        ),
      );
      this.spritesheets = new SpritesheetsManager(
        new spritesheetMod.default(this.textures),
      ) as SpritesheetsManager<Spritesheet<T>>;
    }

    this.startTime = new Date();

    this.config.play.art = this;
    this.config.pause.art = this;

    this.config.play.setRenderMode(this.config.mode);
    this.config.pause.setRenderMode(this.config.mode);

    await this.config.play.init();
    await this.config.pause.init();

    await this.renderer.init(
      this.config.container ?? CONTAINER_SELECTOR_DEFAULT,
    );

    window.addEventListener("keydown", (e) => {
      const key = e.key.toLowerCase();
      if (["arrowup", "w"].includes(key)) this.keys.up = true;
      if (["arrowright", "d"].includes(key)) this.keys.right = true;
      if (["arrowdown", "s"].includes(key)) this.keys.down = true;
      if (["arrowleft", "a"].includes(key)) this.keys.left = true;
      if (key === " ") this.keys.space = true;
    });

    window.addEventListener("keyup", (e) => {
      const key = e.key.toLowerCase();
      if (["arrowup", "w"].includes(key)) this.keys.up = false;
      if (["arrowright", "d"].includes(key)) this.keys.right = false;
      if (["arrowdown", "s"].includes(key)) this.keys.down = false;
      if (["arrowleft", "a"].includes(key)) this.keys.left = false;
      if (key === " ") this.keys.space = false;
    });
    try {
      this.renderer.run();
    } catch (e) {
      if (this.startTime) {
        const { hours, minutes, seconds } = diffHMS(new Date(), this.startTime);
        console.log(`Time since start ${hours}:${minutes}:${seconds}`);
      }
      console.error(e);
    }
  }

  async play(): Promise<void> {
    this.audio.onOffSwitch();
    this.config.play.start();
    this.config.pause.stop();
    this.isPlaying = true;
    this.renderer.play();
  }

  async pause(): Promise<void> {
    this.audio.onOffSwitch();
    this.config.pause.start();
    this.config.play.stop();
    this.isPlaying = false;
    this.renderer.pause();
  }
}

function diffHMS(date1: Date, date2: Date) {
  let diff = Math.abs(date2.getTime() - date1.getTime());
  const hours = Math.floor(diff / (1000 * 60 * 60));
  diff -= hours * 1000 * 60 * 60;
  const minutes = Math.floor(diff / (1000 * 60));
  diff -= minutes * 1000 * 60;
  const seconds = Math.floor(diff / 1000);
  return { hours, minutes, seconds };
}
