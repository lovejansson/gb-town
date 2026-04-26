type MaybePromise<T> = T | Promise<T>;

export interface SpritesheetAdapter<T> {
  createSpritesheet(
    name: string,
    source: string,
    json: AsepriteJSON,
  ): MaybePromise<void>;
  getSpritesheet(name: string): T;
}

export default class SpritesheetsManager<T> {
  private adapter: SpritesheetAdapter<T>;

  constructor(adapter: SpritesheetAdapter<T>) {
    this.adapter = adapter;
  }

  /**
   * Adds a spritesheet to be created.
   *
   * @param name The name of the spritesheet, used to reference it.
   * @param texture The key to reference the texture for the spritesheet. Create a texture via TexturesManager.
   * @param json The json file definition for the spritesheet from Aseprite.
   */
  async create(
    name: string,
    texture: string,
    json: AsepriteJSON,
  ): Promise<void> {
    return this.adapter.createSpritesheet(name, texture, json);
  }

  /**
   * Retrieves a spritesheet by name.
   * @param name The name of the spritesheet.
   * @returns The Spritesheet.
   * @throws SpritesheetNotAddedError if the spritesheet has not been created.
   */
  get(name: string): T {
    return this.adapter.getSpritesheet(name);
  }
}

export class SpritesheetNotAddedError extends Error {
  constructor(key: string) {
    super(`Spritesheet: ${key} not added`);
  }
}

export type SpritesheetCanvas = {
  data: AsepriteJSON;
  image: string;
};

export type Rect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type Size = {
  w: number;
  h: number;
};

export type AsepriteFrame = {
  frame: Rect;
  rotated: boolean;
  trimmed: boolean;
  spriteSourceSize: Rect;
  sourceSize: Size;
  duration: number;
};

export type AsepriteFrameTag = {
  name: string;
  from: number;
  to: number;
  direction: "forward" | "reverse" | "pingpong";
  color: string;
};

export type AsepriteLayer = {
  name: string;
  group?: string;
  opacity?: number;
  blendMode?: string;
};

export type AsepriteMeta = {
  app: string;
  version: string;
  image: string;
  format: string;
  size: Size;
  scale: string;
  frameTags: AsepriteFrameTag[];
  layers: AsepriteLayer[];
  slices: any[];
};

export type AsepriteJSON = {
  frames: { [key: string]: AsepriteFrame };
  meta: AsepriteMeta;
};

export type PixiRect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type PixiSize = {
  w: number;
  h: number;
};

export type PixiJSON = {
  frames: { [key: string]: PixiFrame };
  meta: PixiMeta;
  animations: { [key: string]: string[] };
};

export type PixiFrame = {
  frame: PixiRect;
  spriteSourceSize: PixiRect;
  sourceSize: PixiSize;
  anchor: { x: number; y: number };
  duration: number;
};

export type PixiMeta = {
  image: string;
  format: string;
  size: PixiSize;
  scale: string;
};
