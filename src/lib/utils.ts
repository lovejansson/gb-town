import type { Texture } from "pixi.js";
import { type Vec2 } from "./types";

export async function loadShader(src: string): Promise<string> {
  try {
    const shader = await fetch(src);
    const text = await shader.text();
    return text;
  } catch (e) {
    console.error(e);
    throw new Error("Failed to load shader, view error logs");
  }
}


export async function createTextureFromBase64(
  base64: string,
): Promise<Texture> {
  const { Texture } = await import("pixi.js");
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

export function posToCell(pos: Vec2, tileSize: number) {
    return {row: pos.y / tileSize, col: pos.x / tileSize}
}

