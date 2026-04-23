export type Vec2 = { x: number; y: number };

export type Cell = { row: number; col: number };

export type Direction = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";

export interface AsepriteRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface AsepriteSize {
  w: number;
  h: number;
}

export interface AsepriteFrame {
  frame: AsepriteRect;
  rotated: boolean;
  trimmed: boolean;
  spriteSourceSize: AsepriteRect;
  sourceSize: AsepriteSize;
  duration: number;
}

export interface AsepriteFrameTag {
  name: string;
  from: number;
  to: number;
  direction: "forward" | "reverse" | "pingpong";
  color: string;
}

export interface AsepriteLayer {
  name: string;
  group?: string;
  opacity?: number;
  blendMode?: string;
}

export interface AsepriteMeta {
  app: string;
  version: string;
  format: string;
  size: AsepriteSize;
  scale: string;
  frameTags: AsepriteFrameTag[];
  layers: AsepriteLayer[];
  slices: any[];
}

export interface AsepriteJSON {
  frames: {[key: string]: AsepriteFrame};
  meta: AsepriteMeta;
}
