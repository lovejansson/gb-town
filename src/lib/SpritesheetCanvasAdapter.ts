import {
 type  AsepriteJSON,
 type  SpritesheetAdapter,
  type SpritesheetCanvas,
  SpritesheetNotAddedError,
} from "./SpritesheetsManager";

export default class SpritesheetCanvasAdapter implements SpritesheetAdapter<SpritesheetCanvas> {
  private spritesheets: Map<string, SpritesheetCanvas>;

  constructor() {
    this.spritesheets = new Map();
  }

  /**
   * Adds a spritesheet to be created.
   *
   * @param name The name to reference the spritesheet.
   * @param texture The name to reference the image for the spritesheet, should be registered in the ImagesManager!
   * @param json The json file definition for the spritesheet from Aseprite.
   */
  createSpritesheet(name: string, image: string, json: AsepriteJSON): void {
    this.spritesheets.set(name, { image: image, data: json });
  }

  /**
   * Retrieves a spritesheet by name.
   * @param name The name for the spritesheet.
   * @returns The Spritesheet.
   * @throws SpritesheetNotAddedError if the spritesheet has not been created yet.
   */
  getSpritesheet(name: string): SpritesheetCanvas {
    const s = this.spritesheets.get(name);
    if (!s) throw new SpritesheetNotAddedError(name);
    return s;
  }
}

