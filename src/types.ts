export type Vec2 = {
  x: number;
  y: number;
};

export type Tilemap = {
  tilemap: string;
  name: string;
  tileSize: number;
  width: number;
  height: number;
  rows: number;
  cols: number;
  attributes: { pos: Vec2; attributes: { [key: string]: any } }[];
  objects: {
    image: string;
    width: number;
    height: number;
    pos: Vec2;
    name: string;
  }[];
};
