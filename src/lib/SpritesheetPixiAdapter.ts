import { Spritesheet } from "pixi.js";
import {
  type AsepriteJSON,
  type PixiFrame,
  type PixiJSON,
  type SpritesheetAdapter,
  SpritesheetNotAddedError,
} from "./SpritesheetsManager";
import TexturesManager from "./TexturesManager";

export default class SpritesheetPixiAdapter implements SpritesheetAdapter<
  Spritesheet<PixiJSON>
> {
  private spritesheets: Map<string, Spritesheet<PixiJSON>>;
  private textures: TexturesManager;

  constructor(textures: TexturesManager) {
    this.textures = textures;
    this.spritesheets = new Map();
  }

  /**
   * Adds a spritesheet to be created.
   *
   * @param name The name to reference the spritesheet.
   * @param texture The name to reference the texture for the spritesheet. Create a texture via TexturesManager.
   * @param json The json file definition for the spritesheet from Aseprite.
   */
  async createSpritesheet(
    name: string,
    texture: string,
    json: AsepriteJSON,
  ): Promise<void> {
    const jsonPixie = this.convertAsepriteToPixie(json);

    const tex = this.textures.get(texture);

    const spritesheet = new Spritesheet(tex, jsonPixie);

    await spritesheet.parse();

    this.spritesheets.set(name, spritesheet);
  }

  /**
   * Retrieves a spritesheet by name.
   * @param name The name for the spritesheet.
   * @returns The Spritesheet.
   * @throws SpritesheetNotAddedError if the texture has not been created yet.
   */
  getSpritesheet(name: string): Spritesheet<PixiJSON> {
    const spritesheet = this.spritesheets.get(name);
  
    if (!spritesheet) throw new SpritesheetNotAddedError(name);
    return spritesheet;
  }

  private convertAsepriteToPixie(spritesheet: AsepriteJSON): PixiJSON {
    const frames: { [k: string]: PixiFrame } = {};
    for (const [k, v] of Object.entries(spritesheet.frames)) {
      frames[k] = {
        frame: v.frame,
        spriteSourceSize: v.spriteSourceSize,
        sourceSize: v.sourceSize,
        anchor: { x: 0, y: 0 },
        duration: v.duration,
      };
    }

    const animations: { [k: string]: string[] } = {};

    for (const tag of spritesheet.meta.frameTags) {
      const animationFrames: string[] = [];
      for (let i = tag.from; i <= tag.to; ++i) {
        animationFrames.push(`${tag.name}-${i - tag.from}`);
      }
      animations[tag.name] = animationFrames;
    }

    return {
      frames,
      meta: {
        format: spritesheet.meta.format,
        image: spritesheet.meta.image,
        scale: spritesheet.meta.scale,
        size: spritesheet.meta.size,
      },
      animations: animations,
    };
  }
}