import type {
  AnimatedSprite,
  Container,
  ContainerChild,
  Sprite as PixiSprite,
  Texture,
} from "pixi.js";

type PixiClasses = {
  AnimatedSprite: typeof AnimatedSprite;
  Container: typeof Container;
  Sprite: typeof PixiSprite;
  Texture: typeof Texture;
};

let _pixi: PixiClasses | null = null;

export async function preloadPixiClasses(): Promise<void> {
  const { AnimatedSprite, Container, Sprite, Texture } = await import(
    "pixi.js"
  );
  _pixi = { AnimatedSprite, Container, Sprite, Texture };
}
import Art, { RenderMode } from "./Art.ts";
import type ArtObject from "./objects/ArtObject.ts";
import StaticImage from "./objects/StaticImage.ts";
import Sprite from "./objects/Sprite.ts";
import ShaderObject from "./objects/ShaderObject.ts";

export default abstract class Scene {
  art: Art<RenderMode> | null;
  container: Container | null;
  objects: ArtObject[];
  private renderMode: RenderMode | null;
  private pixiObjects: Map<number, ContainerChild[]>;

  constructor() {
    if (new.target === Scene) {
      throw new TypeError("Cannot construct Scene instances directly");
    }
    this.art = null; // Will be set by the Art class on initialization
    this.container = null;
    this.objects = [];
    this.renderMode = null;
    this.pixiObjects = new Map<number, ContainerChild[]>();
  }

  abstract init(): Promise<void>;

  setRenderMode(mode: RenderMode): void {
    this.clearObjectVisuals();
    this.renderMode = mode;

    if (mode === RenderMode.PIXI) {
      this.container = new _pixi!.Container();
      this.container.sortableChildren = true;
      return;
    }

    this.container = null;
  }

  addObject(obj: ArtObject): void {
    if (this.renderMode === null) {
      throw new Error("Render mode is not set on scene.");
    }

    if (this.objects.some((o) => o.id === obj.id))
      throw new Error(`Object with id ${obj.id} is already added to scene.`);

    this.objects.push(obj);

    if (this.renderMode === RenderMode.PIXI) {
      this.attachPixiChild(obj);
    }
  }

  removeObject(obj: ArtObject): void {
    if (this.renderMode === null) return;

    this.objects = this.objects.filter((o) => o.id !== obj.id);

    if (this.renderMode === RenderMode.PIXI) {
      this.detachPixiChild(obj);
    }
  }

  addPixiChild(node: ContainerChild): void {
    if (this.container === null) return;
    this.container.addChild(node as never);
  }

  removePixiChild(node: ContainerChild): void {
    node.removeFromParent();
  }

  sortObjects(compareFn: (a: ArtObject, b: ArtObject) => number): void {
    this.objects.sort(compareFn);

    if (this.renderMode === RenderMode.PIXI) {
      this.refreshVisualOrder();
    }
  }

  getRenderMode(): RenderMode | null {
    return this.renderMode;
  }

  update(dt: number): void {
    for (const obj of this.objects) {
      obj.update(dt);

      if (this.renderMode === RenderMode.PIXI) {
        this.syncPixiChild(obj);
      }
    }
  }

  private attachPixiChild(obj: ArtObject): void {
    if (this.art === null)
      throw new Error("art instance is not set on scene object");

    if (obj instanceof StaticImage) {
      const texture = this.art.textures.get(obj.image);
      const sprite = new _pixi!.Sprite(texture);
      sprite.position.set(obj.pos.x, obj.pos.y);
      sprite.width = obj.width;
      sprite.height = obj.height;
      sprite.zIndex = this.objects.length - 1;
      this.pixiObjects.set(obj.id, [sprite]);
      this.addPixiChild(sprite);
      return;
    }

    if (obj instanceof Sprite) {
      const main = new _pixi!.AnimatedSprite([_pixi!.Texture.EMPTY]);
      const overlay = new _pixi!.AnimatedSprite([_pixi!.Texture.EMPTY]);
      main.visible = false;
      overlay.visible = false;
      main.zIndex = this.objects.length - 1;
      overlay.zIndex = this.objects.length - 1;
      obj.animations.attachPixiSprites(main, overlay);
      this.addPixiChild(main);
      this.addPixiChild(overlay);
      // overlay starts detached; AnimationManager adds it when play() sets drawBehind/drawOnTop
      this.pixiObjects.set(obj.id, [main, overlay]);
      return;
    }

    if (obj instanceof ShaderObject) {
      const pixieChild = obj.getPixiContainer();

      pixieChild.zIndex = this.objects.length - 1;
      this.pixiObjects.set(obj.id, [pixieChild]);
      this.addPixiChild(pixieChild);
      return;
    }
  }

  private detachPixiChild(obj: ArtObject): void {
    const visuals = this.pixiObjects.get(obj.id);
    if (!visuals) return;

    for (const v of visuals) v.removeFromParent();
    this.pixiObjects.delete(obj.id);
  }

  private syncPixiChild(obj: ArtObject): void {
    const pixiObjects = this.pixiObjects.get(obj.id);
    if (!pixiObjects) return;

    if (obj instanceof StaticImage && pixiObjects[0] instanceof _pixi!.Sprite) {
      pixiObjects[0].position.set(obj.pos.x, obj.pos.y);
      if (pixiObjects[0].width !== obj.width) pixiObjects[0].width = obj.width;
      if (pixiObjects[0].height !== obj.height) pixiObjects[0].height = obj.height;
      return;
    }

    if (obj instanceof Sprite && pixiObjects[0] instanceof _pixi!.AnimatedSprite) {
     
      if (pixiObjects[0].width !== obj.width) pixiObjects[0].width = obj.width;
      if (pixiObjects[0].height !== obj.height) pixiObjects[0].height = obj.height;

      // OBS the position of the animated sprite is updated insideof the animation manager to be able to also set the overlay position correctly
      return;
    }

    if (obj instanceof ShaderObject) {
      pixiObjects[0].position.set(obj.pos.x, obj.pos.y);
    }
  }

  private refreshVisualOrder(): void {
    for (let i = 0; i < this.objects.length; i++) {
      const visuals = this.pixiObjects.get(this.objects[i].id);
      if (!visuals) continue;
      for (const v of visuals) {
        v.zIndex = i;
      }
    }
  }

  private clearObjectVisuals(): void {
    for (const visuals of this.pixiObjects.values()) {
      for (const v of visuals) v.removeFromParent();
    }
    this.pixiObjects.clear();
  }

  start(): void {
    // Can be overridden by subclasses
  }

  stop(): void {
    // Can be overridden by subclasses
  }
}
