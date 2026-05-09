import {
  AmbientSprite,
  ArtObject,
  Scene,
  ShaderObject,
  StaticImage,
  type Vec2,
} from "./lib";
import { type Tilemap } from "./types";
import skaterJSON from "./spritesheets/skater-spritesheet.json";
import foodJSON from "./spritesheets/foods.json";
import shorelineJSON from "./spritesheets/shoreline.json";
import doorSmallJSON from "./spritesheets/door-small.json";
import doorBigJSON from "./spritesheets/door-big.json";
import cartDoor from "./spritesheets/cart-door.json";
import ferryWindow from "./spritesheets/ferry-window.json";
import { type AsepriteJSON } from "./lib/index";
import { loadShader } from "./lib/utils";
import { Color, Filter, GlProgram, Graphics, UniformGroup } from "pixi.js";
import Human from "./Human";
import Bench from "./skate/Bench";
import Obstacle, { BEHIND_RAMP_OFFSET, Flat, Ramp } from "./skate/Obstacle";
import { createGrid } from "./grid";
import House, { Door } from "./House";
import { posToCell } from "./utils";
import { getCollision } from "./lib/collision";
import Restaurant, { Table, Tables } from "./restaurant/Restaurant";
import FerrisWheel from "./ferris/FerrisWheel";

const color1 = new Color("#1d0c24");
const color2 = new Color("#63415f");
const color3 = new Color("#ce9685");
const color4 = new Color("#e8dcc1");

export default class Play extends Scene {
  private tilemap: Tilemap;
  private water!: Water;
  grid: (0 | 1)[][];
  zIndexMap: Map<number, number>;
  private staticObjects: ArtObject[];
  private humans: Human[];
  public tables!: Tables;
  public restaurants: Restaurant[];
  public houses: House[];

  constructor(tilemap: Tilemap) {
    super();
    this.tilemap = tilemap;
    this.grid = [];
    this.humans = [];
    this.staticObjects = [];
    this.restaurants = [];
    this.houses = [];
    this.zIndexMap = new Map();
  }

  getFerrisWheel(): FerrisWheel {
    const ferrisWheels = this.staticObjects.filter(
      (o): o is FerrisWheel => o instanceof FerrisWheel,
    );

    if (ferrisWheels.length === 0) {
      throw new Error("No ferris wheel found in static objects.");
    }

    if (ferrisWheels.length > 1) {
      throw new Error("Expected exactly one ferris wheel in static objects.");
    }

    return ferrisWheels[0];
  }

  get obstacles() {
    return this.staticObjects.filter((o) => o instanceof Obstacle);
  }

  get benches() {
    return this.staticObjects.filter((o) => o instanceof Bench);
  }

  async init(): Promise<void> {
    if (this.art === null) throw new Error("Art is null");

    this.art.textures.add("skater", "assets/skater-spritesheet.png");
    this.art.textures.add("shoreline", "assets/shoreline.png");
    this.art.textures.add("bg", this.tilemap.tilemap);
    this.art.textures.add("door-small", "assets/door-small.png");
    this.art.textures.add("door-big", "assets/door-big.png");
    this.art.textures.add("foods", "assets/foods.png");
    this.art.textures.add("cart", "assets/cart.png");
    this.art.textures.add("ferry-window", "assets/ferry-window.png");
    this.art.textures.add("cart-door", "assets/cart-door.png");

    const c = document.createElement("canvas");
    c.width = 1;
    c.height = 1;
    this.art.textures.add("flat", c.toDataURL("image/png"));

    for (const o of this.tilemap.objects) {
      this.art.textures.add(o.name, o.image);
    }

    await this.art.textures.load();
    await this.art.spritesheets.create(
      "foods",
      "foods",
      foodJSON as AsepriteJSON,
    );

    await this.art.spritesheets.create(
      "skater",
      "skater",
      skaterJSON as AsepriteJSON,
    );

    await this.art.spritesheets.create(
      "shoreline",
      "shoreline",
      shorelineJSON as AsepriteJSON,
    );

    await this.art.spritesheets.create(
      "door-small",
      "door-small",
      doorSmallJSON as AsepriteJSON,
    );
    await this.art.spritesheets.create(
      "door-big",
      "door-big",
      doorBigJSON as AsepriteJSON,
    );
    await this.art.spritesheets.create(
      "ferry-window",
      "ferry-window",
      ferryWindow as AsepriteJSON,
    );
    await this.art.spritesheets.create(
      "cart-door",
      "cart-door",
      cartDoor as AsepriteJSON,
    );

    const waterTile = this.tilemap.attributes.find((a) =>
      a.attributes.hasOwnProperty("isWaterTopLeft"),
    );

    if (waterTile === undefined)
      throw new Error("water start tile not exported");

    const waterWidth = this.art.width;

    const waterHeight = this.art.tileSize * 6;

    const bg = new StaticImage(
      this,
      { x: 0, y: 0 },
      this.art.width,
      this.art.height,
      "bg",
    );

    this.addObject(bg);
    this.staticObjects.push(bg);

    this.zIndexMap.set(bg.id, -2);

    const flat = new Flat(
      this,
      { x: 0, y: 0 },
      this.art.tileSize,
      this.art.tileSize,
    );

    this.addObject(flat);

    this.zIndexMap.set(flat.id, -3);

    this.staticObjects.push(flat);

    let dock = this.tilemap.objects.find((o) => o.name === "dock");

    this.water = new Water(
      this,
      { x: 0, y: waterTile.pos.y },
      waterWidth,
      waterHeight,
    );
    await this.water.create({
      width: dock!.width,
      height: dock!.height,
      pos: dock!.pos,
    });

    this.addObject(this.water);

    this.staticObjects.push(this.water);

    this.zIndexMap.set(this.water.id, -1);

    const shorelineSpritesheet = this.art.spritesheets.get("shoreline");
    const frameW = shorelineSpritesheet.data.meta.size.w;
    const frameH = shorelineSpritesheet.data.meta.size.h;

    for (let i = 0; i < 14; ++i) {
      const sl = new AmbientSprite(
        this,
        { x: i * frameW, y: waterTile.pos.y - this.art.tileSize },
        frameW,
        frameH,
        "shoreline",
        "shoreline",
      );

      this.addObject(sl);
      this.staticObjects.push(sl);
      this.zIndexMap.set(sl.id, -1);
    }

    const walkableTiles = this.tilemap.attributes.filter(
      (ta) =>
        ta.attributes.hasOwnProperty("isPark") ||
        ta.attributes.hasOwnProperty("isWalkable"),
    );

    this.grid = createGrid(this.tilemap.rows, this.tilemap.cols, 1);

    for (const t of walkableTiles) {
      const cell = posToCell({ x: t.pos.x, y: t.pos.y }, this.art.tileSize);
      this.grid[cell.row][cell.col] = 0;
    }

    const layerZ = 10;
    const dockFootprints: {
      rStart: number;
      rEnd: number;
      cStart: number;
      cEnd: number;
    }[] = [];
    const houseFurnitureFootprints: {
      rStart: number;
      rEnd: number;
      cStart: number;
      cEnd: number;
    }[] = [];
    const ferrisFootprints: {
      rStart: number;
      rEnd: number;
      cStart: number;
      cEnd: number;
    }[] = [];

    for (const o of this.tilemap.objects) {
      let obj;

      if (o.name === "ferry-wheel") {
        if (
          this.staticObjects.find((obj) => obj instanceof FerrisWheel) !==
          undefined
        ) {
          throw new Error("Only one ferris wheel is supported.");
        }

        obj = new FerrisWheel(this, o.pos, o.width, o.height, o.name);
        const carts = obj.createCarts();

        for (const c of carts) {
          this.addObject(c);

          this.staticObjects.push(c);
          this.zIndexMap.set(c.id, o.layerIdx * layerZ + 1);

          const cartDoor = c.getDoor();
          this.addObject(cartDoor);
          this.staticObjects.push(cartDoor);
          this.zIndexMap.set(cartDoor.id, o.layerIdx * layerZ + 3);
        }
      } else if (o.name === "ferry") {
        const door = new Door(
          this,
          {
            x: o.pos.x + this.art.tileSize,
            y: o.pos.y + o.height - this.art.tileSize - 4,
          },
          this.art.tileSize * 2,
          this.art.tileSize,
          "ferry-window",
        );

        this.staticObjects.push(door);
        this.zIndexMap.set(door.id, o.layerIdx * layerZ + 1);
        this.addObject(door);

        obj = new House(this, o.pos, o.width, o.height, o.name, door);
        this.houses.push(obj);
      } else if (o.name === "bench") {
        obj = new Bench(this, o.pos, o.width, o.height);
      } else if (o.name === "ramp") {
        obj = new Ramp(this, o.pos, o.width, o.height);
      } else if (
        o.attributes !== undefined &&
        o.attributes["door"] &&
        o.name === "pizza"
      ) {
        // Create restaurant with door
        const doorParts = o.attributes["door"].split("-");

        const doorBase = "door-" + doorParts[0];
        const doorNum = parseInt(doorParts[1]);
        const doorHeight =
          doorBase === "door-small" ? this.art.tileSize * 2 : this.art.tileSize;
        const doorWidth =
          doorBase === "door-small" ? this.art.tileSize : this.art.tileSize * 2;

        const door = new Door(
          this,
          {
            x: o.pos.x + parseInt(o.attributes["doorX"]),
            y: o.pos.y + o.height - this.art.tileSize,
          },
          doorWidth,
          doorHeight,
          doorBase,
          doorNum,
        );

        this.staticObjects.push(door);
        this.zIndexMap.set(door.id, o.layerIdx * layerZ + 1);
        this.addObject(door);
        obj = new Restaurant(this, o.pos, o.width, o.height, o.name, door);
        this.restaurants.push(obj);
      } else if (o.name === "round-table") {
        const restaurants =
          o.attributes !== undefined && o.attributes["restaurants"]
            ? o.attributes["restaurants"].split(",")
            : [];

        // SEATS FROM NORTH CLOCKWISE

        obj = new Table(
          this,
          o.pos,
          o.width,
          o.height,
          o.name,
          [
            {
              pos: {
                x: o.pos.x + this.art.tileSize,
                y: o.pos.y - this.art.tileSize,
              },
              direction: "n",
            },
            {
              pos: {
                x: o.pos.x + this.art.tileSize * 2,
                y: o.pos.y,
              },
              direction: "e",
            },
            {
              pos: {
                x: o.pos.x + this.art.tileSize,
                y: o.pos.y + this.art.tileSize,
              },
              direction: "s",
            },
            {
              pos: {
                x: o.pos.x,
                y: o.pos.y,
              },
              direction: "w",
            },
          ],

          restaurants,
        );
      } else if (o.name === "bench-table") {
        const restaurants =
          o.attributes !== undefined && o.attributes["restaurants"]
            ? o.attributes["restaurants"].split(",")
            : [];
        obj = new Table(
          this,
          o.pos,
          o.width,
          o.height,
          o.name,
          [
            {
              pos: {
                x: o.pos.x,
                y: o.pos.y,
              },
              direction: "n",
            },
            {
              pos: {
                x: o.pos.x,
                y: o.pos.y + o.width - this.art.tileSize,
              },
              direction: "e",
            },
            {
              pos: {
                x: o.pos.x + o.width - this.art.tileSize,
                y: o.pos.y + o.height - this.art.tileSize,
              },
              direction: "s",
            },
            {
              pos: {
                x: o.pos.x,
                y: o.pos.y + o.height - this.art.tileSize,
              },
              direction: "w",
            },
          ],
          restaurants,
        );
      } else {
        obj = new StaticImage(this, o.pos, o.width, o.height, o.name);
      }

      const rStart = Math.floor(obj.pos.y / this.art.tileSize);
      const cStart = Math.floor(obj.pos.x / this.art.tileSize);
      const useExpandedFootprint = o.name === "palm";
      const rowSpan = useExpandedFootprint
        ? Math.max(1, Math.ceil(obj.height / this.art.tileSize))
        : Math.floor(obj.height / this.art.tileSize);
      const colSpan = useExpandedFootprint
        ? Math.max(1, Math.ceil(obj.width / this.art.tileSize))
        : Math.floor(obj.width / this.art.tileSize);
      const rEnd = rStart + rowSpan;
      const cEnd = cStart + colSpan;

      if (o.name === "ferry-wheel") {
        ferrisFootprints.push({ rStart, rEnd, cStart, cEnd });
      } else if (o.name === "dock") {
        dockFootprints.push({ rStart, rEnd, cStart, cEnd });
      } else if (o.category === "houses" || o.category === "furniture") {
        houseFurnitureFootprints.push({ rStart, rEnd, cStart, cEnd });
      }

      // if (obj instanceof Restaurant) {
      //   continue;
      // }

      this.addObject(obj);

      this.staticObjects.push(obj);
      this.zIndexMap.set(obj.id, o.layerIdx * layerZ);

      if (o.name === "bar-lamps") {
        this.zIndexMap.set(obj.id, o.layerIdx + 10 * layerZ);
      }
    }

    // Apply walkability in deterministic order.
    for (const area of dockFootprints) {
      for (let r = area.rStart; r < area.rEnd; ++r) {
        for (let c = area.cStart; c < area.cEnd; ++c) {
          this.grid[r][c] = 0;
        }
      }

      // Block columns around dock vertical sides (outside dock), with a small
      // extra margin so paths do not slip through near corners.
      const leftCols = [area.cStart - 1, area.cStart - 2];
      const rightCols = [area.cEnd, area.cEnd + 1];
      const rFrom = Math.max(0, area.rStart - 1);
      const rTo = Math.min(this.grid.length - 1, area.rEnd);

      for (let r = rFrom; r <= rTo; ++r) {
        for (const c of leftCols) {
          if (c >= 0 && c < this.grid[r].length) {
            this.grid[r][c] = 1;
          }
        }

        for (const c of rightCols) {
          if (c >= 0 && c < this.grid[r].length) {
            this.grid[r][c] = 1;
          }
        }
      }
    }

    for (const area of ferrisFootprints) {
      for (let r = area.rStart; r < area.rEnd; ++r) {
        for (let c = area.cStart; c < area.cEnd; ++c) {
          this.grid[r][c] = 0;
        }
      }

      const bottomRow = area.rEnd - 1;
      const widthInTiles = area.cEnd - area.cStart;
      const centerStart = area.cStart + Math.floor((widthInTiles - 3) / 2);

      for (let c = centerStart; c < centerStart + 3; ++c) {
        if (c >= area.cStart && c < area.cEnd) {
          this.grid[bottomRow][c] = 1;
        }
      }
    }

    for (const area of houseFurnitureFootprints) {
      for (let r = area.rStart; r < area.rEnd; ++r) {
        for (let c = area.cStart; c < area.cEnd; ++c) {
          this.grid[r][c] = 1;
        }
      }
    }

    console.dir(this.grid);

    this.tables = new Tables(
      this.staticObjects.filter((o) => o instanceof Table),
    );

    const skater = new Human(
      this,
      {
        x: this.art.tileSize * 20,
        y: this.art.tileSize * 20,
      },
      "eat-restaurant",
    );

    const waiterSpawn = this.restaurants[0].getArrivePos();

    const waiter = new Human(
      this,
      {
        x: waiterSpawn.x,
        y: waiterSpawn.y - this.art.tileSize,
      },
      "work-restaurant",
    );

    const ferryHuman = new Human(
      this,
      {
        x: this.art.tileSize * 45,
        y: this.art.tileSize * 20,
      },
      "ride-ferris-wheel",
    );

    this.addObject(skater);
    this.addObject(waiter);
    this.humans.push(waiter);
    this.humans.push(skater);

    this.addObject(ferryHuman);
    this.humans.push(ferryHuman);

    addEventListener("keydown", (e) => {
      if (e.key.toLowerCase() === "f") {
        this.art!.enterFullScreen();
      }
    });
  }

  update(dt: number) {
    super.update(dt);
    this.sortRender();
  }

  sortRender() {
    const sortValues = new Map<number, number>();

    for (const o of this.staticObjects) {
      if (this.zIndexMap.has(o.id)) {
        sortValues.set(o.id, this.zIndexMap.get(o.id)!);
      } else {
        throw new Error("sort value not found for static object");
      }
    }

    for (const s of this.humans) {
      const actionNode = s.getCurrentAction();

      if (
        ["hop-on-ferry", "hop-off-ferry", "queue-to-ferry"].includes(
          actionNode.currentAction,
        )
      ) {
        const cartDoor = this.getFerrisWheel().getCartDoors()[0];

        this.setSortRelativeToObject(sortValues, s, cartDoor, "on-top");
      } else if (actionNode.currentAction === "ride-ferry") {
        const f = this.getFerrisWheel();

        this.setSortRelativeToObject(sortValues, s, f, "on-top");
      } else if (
        actionNode.parentAction === "eat-restaurant" &&
        s.isSitting()
      ) {
        const chair = this.staticObjects.find(
          (o) =>
            o instanceof StaticImage &&
            o.image.includes("chair") &&
            o.pos.x === s.pos.x,
        );

        if (chair === undefined) throw new Error("Chair not found");

        // Sitting on the far side of a table should render behind it.
        if (s.direction === "n") {
          this.setSortRelativeToObject(sortValues, s, chair, "behind");
        } else {
          this.setSortRelativeToObject(sortValues, s, chair, "on-top");
        }
      } else if (actionNode.parentAction === "ramp") {
        const ramp = this.staticObjects.find(
          (o2) => o2 instanceof Ramp && o2.id === actionNode.targetId,
        );

        if (ramp === undefined) throw new Error("Ramp not found in ramp state");

        const isBehindRamp =
          s.pos.y <= ramp.pos.y + BEHIND_RAMP_OFFSET * this.art!.tileSize;
        const isClimbing = actionNode.currentAction === "climb-ramp";
        if (isBehindRamp && isClimbing) {
          this.setSortRelativeToObject(sortValues, s, ramp, "behind");
        } else {
          this.setSortRelativeToObject(sortValues, s, ramp, "on-top");
        }
      } else if (actionNode.currentAction === "bench") {
        if (actionNode.targetId === null)
          throw new Error("Target Id is null for bench action");

        const bench = this.staticObjects.find(
          (o) => o.id === actionNode.targetId,
        );
        if (bench === undefined) throw new Error("Bench target not found");
        this.setSortRelativeToObject(sortValues, s, bench, "on-top", 4);
      } else {
        let max = 0;
        let obj: ArtObject | null = null;

        for (const o of this.staticObjects) {
          if (
            !(o instanceof StaticImage && o.image === "bg") &&
            !(o instanceof ShaderObject || o instanceof AmbientSprite)
          ) {
            const c = getCollision(s, o);

            if (c) {
              const maxOverlap = Math.max(c.overlap.x, c.overlap.y);

              if (maxOverlap > max) {
                max = maxOverlap;
                obj = o;
              }
            }
          }

          if (obj !== null) {
            const lim = obj.pos.y;

            // Render behind when below limit and in on top of when over limit
            if (s.pos.y < lim) {
              this.setSortRelativeToObject(sortValues, s, obj, "behind");
            } else {
              this.setSortRelativeToObject(sortValues, s, obj, "on-top");
            }
          } else {
            sortValues.set(s.id, 4);
          }
        }
      }
    }

    this.sortObjects((s1, s2) => {
      const v1 = sortValues.get(s1.id);
      const v2 = sortValues.get(s2.id);
      if (v1 === undefined || v2 === undefined) {
        console.log("Render sort error", s1, s2);
        return 0;
      }

      if (v1 === v2) {
        // Keep ordering deterministic for equal layers.
        return s1.id - s2.id;
      }

      return v1 - v2;
    });
  }

  private setSortRelativeToObject(
    sortMap: Map<number, number>,
    subject: ArtObject,
    reference: ArtObject,
    placement: "behind" | "on-top",
    offset: number = 1,
  ) {
    const referenceSort = this.zIndexMap.get(reference.id);

    if (referenceSort === undefined)
      throw new Error("sort value not found for reference object");

    const absOffset = Math.abs(offset);
    const direction = placement === "behind" ? -1 : 1;
    sortMap.set(subject.id, referenceSort + direction * absOffset);
  }
}

const pointVelocities = [1, 1, 1, 1, -1, -1, -1, -1];

class Water extends ShaderObject {
  private frameMs: number;
  private pvIdx: number;
  private translate: number;

  private graphics!: Graphics;
  private waveFilter!: Filter;

  constructor(scene: Play, pos: Vec2, width: number, height: number) {
    super(scene, pos, width, height);

    this.frameMs = 0;
    this.pvIdx = 0;
    this.translate = 0;
  }

  async create(shadow: { width: number; height: number; pos: Vec2 }) {
    const fragment = await loadShader("/water.frag");
    const vertex = await loadShader("/water.vert");

    this.waveFilter = new Filter({
      glProgram: new GlProgram({
        name: "water",
        fragment,
        vertex,
      }),
      resources: {
        uniforms: new UniformGroup({
          uTime: { value: 0.0, type: "f32" },
          uDockShadowPos: {
            value: new Float32Array([shadow!.pos.x, 0]),
            type: "vec2<f32>",
          },
          uDockShadowWidth: { value: shadow!.width, type: "f32" },
          uDockShadowHeight: {
            value: 4 * this.scene.art!.tileSize,
            type: "f32",
          },
          uWaveColor: { value: color3, type: "vec3<f32>" },
          uWaterColor: { value: color2, type: "vec3<f32>" },
          uWaterColorShadow: { value: color1, type: "vec3<f32>" },
          uWaveColorShadow: { value: color2, type: "vec3<f32>" },
          uResolution: {
            value: new Float32Array([this.width, this.height]),
            type: "vec2<f32>",
          },
          uTranslate: {
            value: this.translate,
            type: "f32",
          },
        }),
      },
    });

    this.graphics = new Graphics()
      .rect(0, 0, this.width, this.height)
      .fill("#63415f");

    this.graphics.filters = [this.waveFilter];
    this.graphics.position.set(this.pos.x, this.pos.y);
  }

  getPixiContainer(): Graphics {
    return this.graphics;
  }

  update(dt: number) {
    this.frameMs += dt;

    if (this.frameMs >= 150) {
      this.frameMs = 0;
      this.translate += pointVelocities[this.pvIdx];

      this.pvIdx++;

      this.waveFilter.resources.uniforms.uniforms.uTranslate = this.translate;
    }

    this.waveFilter.resources.uniforms.uniforms.uTime += 0.01;

    if (this.pvIdx === pointVelocities.length) {
      this.pvIdx = 0;
      this.translate = 0;
    }
  }
}
