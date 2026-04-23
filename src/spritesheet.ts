export function convertAsepriteToPixie(spritesheet: AsepriteJSON): PixieJSON {
  const frames: { [k: string]: PixieFrame } = {};
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
    for (let i = tag.from; i < tag.to; ++i) {
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

export type PixieJSON = {
  frames: { [key: string]: PixieFrame };
  meta: PixieMeta;
  animations: { [key: string]: string[] };
};

export type PixieFrame = {
  frame: Rect;
  spriteSourceSize: Rect;
  sourceSize: Size;
  anchor: { x: number; y: number };
  duration: number;
};

export type PixieMeta = {
  image: string;
  format: string;
  size: Size;
  scale: string;
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
