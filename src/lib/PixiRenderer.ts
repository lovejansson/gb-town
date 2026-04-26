import { Application } from "pixi.js";
import type Art from "./Art.ts";
import type { ArtConfig } from "./Art.ts";
import { RenderMode } from "./Art.ts";
import type Scene from "./Scene.ts";
import { scaleToSize, RendererUnInitialized, type RendererAdapter } from "./Renderer.ts";

export class PixiRenderer implements RendererAdapter {
  private app: Application | null;
  private art: Art<RenderMode.PIXI>;
  private playScene: Scene;
  private pauseScene: Scene;

  constructor(art: Art<RenderMode.PIXI>, config: ArtConfig<RenderMode.PIXI>) {
    this.app = null; // Is set in init();
    this.art = art;
    this.playScene = config.play;
    this.pauseScene = config.pause;
  }
  play(): void {
    this.syncPixieSceneVisibility();
  }
  pause(): void {
    this.syncPixieSceneVisibility();
  }

  async init(containerSelector: string): Promise<void> {
    this.app = new Application();

    await this.app.init({
      roundPixels: true,
      preference: "webgl",
      width: this.art.width,
      height: this.art.height,
      resolution: 1,
    });

    const pixieContainer =
      document.querySelector<HTMLElement>(containerSelector);

    if (pixieContainer === null) throw new Error("Art container not found");

    const scaled = scaleToSize(this.art.scale);
    const displayW = scaled ? scaled.width : this.art.width;
    const displayH = scaled ? scaled.height : this.art.height;

    pixieContainer.style.width = `${displayW}px`;
    pixieContainer.style.height = `${displayH}px`;

    this.app.canvas.style.width = `${displayW}px`;
    this.app.canvas.style.height = `${displayH}px`;
    this.app.canvas.style.imageRendering = "pixelated";

    pixieContainer.appendChild(this.app.canvas);
  }

  run(): void {
    if (this.app === null) throw new RendererUnInitialized();

    if (this.playScene.container !== null) {
      this.app.stage.addChild(this.playScene.container);
    }

    if (this.pauseScene.container !== null) {
      this.app.stage.addChild(this.pauseScene.container);
    }

    this.syncPixieSceneVisibility();

    this.app.ticker.add((time) => {
      if (this.art.isPlaying) {
        this.playScene.update(time.deltaMS);

        if (this.art.displayGrid) {
          // TODO: draw pixie grid
        }
      } else {
        this.pauseScene.update(time.deltaMS);
      }
    });
  }

  private syncPixieSceneVisibility(): void {
    if (this.playScene.container !== null) {
      this.playScene.container.visible = this.art.isPlaying;
    }

    if (this.pauseScene.container !== null) {
      this.pauseScene.container.visible = !this.art.isPlaying;
    }
  }
}
