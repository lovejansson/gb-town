import Art, { type ArtConfig, RenderMode } from "./Art";
import StaticImage from "./objects/StaticImage";
import Sprite from "./objects/Sprite";
import Scene from "./Scene";
import AmbientSprite from "./objects/AmbientSprite";

export function scaleToSize(
  scale: "hd" | "4k" | null,
): { width: number; height: number } | null {
  if (scale === "hd") return { width: 1920, height: 1080 };
  if (scale === "4k") return { width: 3840, height: 2160 };
  return null;
}

export interface RendererAdapter {
  init(containerSelector: string): Promise<void>;
  run(elapsed?: number): void;
  play?(): void;
  pause?(): void;
}

export default class Renderer {
  private adapter;

  constructor(adapter: RendererAdapter) {
    this.adapter = adapter;
  }

  async init(containerSelector: string): Promise<void> {
    await this.adapter.init(containerSelector);
  }

  run() {
    this.adapter.run();
  }

  play() {
    this.adapter.play && this.adapter.play();
  }

  pause() {
    this.adapter.pause && this.adapter.pause();
  }
}

export class CanvasRenderer implements RendererAdapter {
  private ctx: CanvasRenderingContext2D | null;
  private art: Art<RenderMode.CANVAS>;
  private elapsedPrev: number;
  private playScene: Scene;
  private pauseScene: Scene;

  constructor(
    art: Art<RenderMode.CANVAS>,
    config: ArtConfig<RenderMode.CANVAS>,
  ) {
    this.ctx = null; // Is set in init();
    this.art = art;
    this.playScene = config.play;
    this.pauseScene = config.pause;
    this.elapsedPrev = 0;
  }

  async init(containerSelector: string): Promise<void> {
    const container = document.querySelector<HTMLElement>(containerSelector);

    if (container === null) throw new Error("Art container is null");

    const canvas = document.createElement("canvas");

    canvas.width = this.art.width;
    canvas.height = this.art.height;

    this.ctx = canvas.getContext("2d");

    if (this.ctx === null) throw new Error("ctx is null");

    this.ctx.imageSmoothingEnabled = true;

    const scaled = scaleToSize(this.art.scale);
    canvas.style.width = scaled ? `${scaled.width}px` : `${this.art.width}px`;
    canvas.style.height = scaled
      ? `${scaled.height}px`
      : `${this.art.height}px`;

    canvas.style.imageRendering = "pixelated";

    container.appendChild(canvas);
  }

  run(elapsed: number = 0): void {
    if (this.ctx === null) throw new RendererUnInitialized();

    const dt = elapsed - this.elapsedPrev;

    const currentTransform = this.ctx.getTransform();

    this.ctx.clearRect(
      0 - currentTransform.e,
      0 - currentTransform.f,
      this.art.width,
      this.art.height,
    );

    if (this.art.isPlaying) {
      this.updateSceneAnimations(this.playScene, dt);
      this.playScene.update(dt);

      this.drawSceneCanvasObjects(this.playScene);

      if (this.art.displayGrid) {
        this.drawGrid(
          this.ctx,
          this.art.height / this.art.tileSize,
          this.art.width / this.art.tileSize,
          this.art.tileSize,
          this.art.gridColor,
        );
      }
    } else {
      this.updateSceneAnimations(this.pauseScene, dt);
      this.pauseScene.update(dt);
      this.drawSceneCanvasObjects(this.pauseScene);
    }

    this.elapsedPrev = elapsed;

    requestAnimationFrame((elapsed) => this.run(elapsed));
  }

  private drawGrid(
    ctx: CanvasRenderingContext2D,
    rows: number,
    cols: number,
    cellSize: number,
    strokeColor = "black",
  ) {
    ctx.beginPath();
    ctx.strokeStyle = strokeColor;
    const offset = 0.5;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        ctx.moveTo(c * cellSize + offset, r * cellSize + offset);
        ctx.lineTo((c + 1) * cellSize + offset, r * cellSize + offset);
        ctx.lineTo((c + 1) * cellSize + offset, (r + 1) * cellSize + offset);
        ctx.lineTo(c * cellSize + offset, (r + 1) * cellSize + offset);
        ctx.lineTo(c * cellSize + offset, r * cellSize + offset);
      }
    }
    ctx.stroke();
  }

  private updateSceneAnimations(scene: Scene, dt: number): void {
    for (const obj of scene.objects) {
      if (obj instanceof Sprite) {
        obj.animations.update(dt);
      }
    }
  }

  private drawSceneCanvasObjects(scene: Scene): void {
    if (scene.objects === null) return;

    for (const obj of scene.objects) {
      this.drawCanvasObject(obj);
    }
  }

  private drawCanvasObject(obj: unknown): void {
    if (this.ctx === null) throw new RendererUnInitialized();
    if (obj instanceof StaticImage) {
      const img = this.art.images.get(obj.image);
      if (!img) return;
      this.ctx.drawImage(img, obj.pos.x, obj.pos.y);
      return;
    }

    if (obj instanceof Sprite || obj instanceof AmbientSprite) {
      obj.animations.draw(this.ctx);
      return;
    }
  }
}

export class RendererUnInitialized extends Error {
  constructor() {
    super(`Renderer has not been initialized`);
  }
}
