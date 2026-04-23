import { Texture } from "pixi.js";

export async function createTextureFromBase64(
  base64: string,
): Promise<Texture> {
  const img = new Image();

  img.src = base64;

  return await new Promise<Texture>((resolve, reject) => {
    img.onerror = () => {
      reject();
    };

    img.onload = () => {
      const tex = Texture.from(img);
      tex.source.scaleMode = "nearest";
      resolve(tex);
    };
  });
}
