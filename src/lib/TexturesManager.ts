import { Assets, Texture } from "pixi.js";

export default class TexturesManager {
  private textures: Map<string, Texture>;
  private paths: Map<string, string>;

  constructor() {
    this.textures = new Map();
    this.paths = new Map();
  }

  /**
   * Adds a texture to be loaded.
   *
   * @param name The key to reference the texture.
   * @param path The URL or path to the texture file.
   */
  add(name: string, path: string): void {
    this.paths.set(name, path);
  }

  /**
   * Loads textures that have been added.
   */
  async load(): Promise<void> {
    const texturePromises: Promise<[string, Texture]>[] = [];

    for (const [name, path] of this.paths.entries()) {
      texturePromises.push(
        new Promise(async (resolve, reject) => {
          try {
            const tex = await Assets.load(path);
            tex.source.scaleMode = "nearest";

            resolve(tex);
          } catch (e) {
            reject(new LoadTextureError(name, path, (e as Error).message));
          }
        }),
      );
    }

    const textures = await Promise.all(texturePromises);

    for (const [name, tex] of textures) {
      this.textures.set(name, tex);
    }

    this.paths.clear();
  }

  /**
   * Retrieves a loaded texture by name.
   * @param name The key for the texture.
   * @returns The Texture.
   * @throws TextureNotLoadedError if the texture has not been loaded yet.
   */
  get(name: string): Texture {
    const tex = this.textures.get(name);
    if (!tex) throw new TextureNotLoadedError(name);
    return tex;
  }
}

/* ------------------ Error classes ------------------ */

export class TextureNotLoadedError extends Error {
  constructor(name: string) {
    super(`Texture: ${name} not loaded`);
  }
}

export class LoadTextureError extends Error {
  constructor(name: string, path: string, inner: string) {
    super(`Failed to load texture: ${name} at: ${path} bc: ${inner}`);
  }
}
