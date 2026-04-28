import {
  AmbientSprite,
  Scene,
  ShaderObject,
  StaticImage,
  type Vec2,
} from "./lib";
import { type Tilemap } from "./types";
import skaterJSON from "./skater-spritesheet.json";
import shorelineJSON from "./shoreline.json";
import { type AsepriteJSON } from "./lib/index";
import { loadShader } from "./lib/utils";
import { Color, Filter, GlProgram, Graphics, UniformGroup } from "pixi.js";
import Human from "./Human";
import Bench from "./skate/Bench";
import Obstacle, { BEHIND_RAMP_OFFSET, Flat, Ramp } from "./skate/Obstacle";
import { createGrid } from "./grid";
import { posToCell } from "./utils";

const color1 = new Color("#1d0c24");
const color2 = new Color("#63415f");
const color3 = new Color("#ce9685");
const color4 = new Color("#e8dcc1");

export default class Play extends Scene {
  private tilemap: Tilemap;
  private water!: Water;
  parkGrid: (0 | 1)[][];
  zIndexMap: Map<number, number>;

  constructor(tilemap: Tilemap) {
    super();
    this.tilemap = tilemap;
    this.parkGrid = [];
    this.zIndexMap = new Map();
  }

  get benches() {
    return this.objects.filter((o) => o instanceof Bench);
  }

  get obstacles() {
    return this.objects.filter((o) => o instanceof Obstacle);
  }

  get skaters() {
    return this.objects.filter((o) => o instanceof Human);
  }

  get staticBg() {
    return this.objects.filter((o) => o instanceof StaticImage);
  }

  async init(): Promise<void> {
    if (this.art === null) throw new Error("Art is null");

    this.art.textures.add("skater", "assets/skater-spritesheet.png");
    this.art.textures.add("shoreline", "assets/shoreline.png");
    this.art.textures.add("bg", this.tilemap.tilemap);

    const c = document.createElement("canvas");
    c.width = 1;
    c.height = 1;
    this.art.textures.add("flat", c.toDataURL("image/png"));

    for (const o of this.tilemap.objects) {
      this.art.textures.add(o.name, o.image);
    }

    await this.art.textures.load();

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

    const waterTile = this.tilemap.attributes.find((a) =>
      a.attributes.hasOwnProperty("isWaterTopLeft"),
    );

    if (waterTile === undefined)
      throw new Error("water start tile not exported");

    const waterWidth = parseInt(waterTile.attributes["width"]);
    const waterHeight = parseInt(waterTile.attributes["height"]);

    const bg = new StaticImage(
      this,
      { x: 0, y: 0 },
      this.art.width,
      this.art.height,
      "bg",
    );
    this.addObject(bg);

    this.zIndexMap.set(bg.id, -1);

    this.addObject(
      new Flat(this, { x: 0, y: 0 }, this.art.tileSize, this.art.tileSize),
    );

    let dock = this.tilemap.objects.find((o) => o.name === "dock");

    this.water = new Water(
      this,
      { x: 0, y: waterTile.pos.y },
      waterWidth,
      waterHeight,
    );
    await this.water.init({
      width: dock!.width,
      height: dock!.height,
      pos: dock!.pos,
    });

    this.addObject(this.water);

    this.zIndexMap.set(this.water.id, 0);

    const shorelineSpritesheet = this.art.spritesheets.get("shoreline");
    const frameW = shorelineSpritesheet.data.frames["shoreline-0"].frame.w;
    const frameH = shorelineSpritesheet.data.frames["shoreline-0"].frame.h;

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
      this.zIndexMap.set(sl.id, 0);
    }

    for (const o of this.tilemap.objects) {
      let obj;
      if (o.name === "bench") {
        obj = new Bench(this, o.pos, o.width, o.height);
      } else if (o.name === "ramp") {
        obj = new Ramp(this, o.pos, o.width, o.height);
      } else {
        obj = new StaticImage(this, o.pos, o.width, o.height, o.name);
      }
      this.addObject(obj);

      this.zIndexMap.set(obj.id, o.layerIdx);
    }

    const gridTiles = this.tilemap.attributes.filter((ta) =>
      ta.attributes.hasOwnProperty("isPark"),
    );

    this.parkGrid = createGrid(this.tilemap.rows, this.tilemap.cols, 1);

    for (const t of gridTiles) {
      const cell = posToCell({ x: t.pos.x, y: t.pos.y }, this.art.tileSize);

      this.parkGrid[cell.row][cell.col] = 0;
    }

    const skater = new Human(this, {
      x: this.art.tileSize * 13,
      y: this.art.tileSize * 3,
    });

    this.addObject(skater);

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
    // Sort objects

    const renderSortCompValue = new Map<number, number>();

    const BG_SORT = -8;
    const WATER_SORT = -4;
    const layerValueStep = 1000;

    // Default sort by y pos
    for (const o of this.objects) {
      if (o instanceof StaticImage && o.image === "bg") {
        renderSortCompValue.set(o.id, BG_SORT);
      } else if (o instanceof ShaderObject || o instanceof AmbientSprite) {
        renderSortCompValue.set(o.id, WATER_SORT);
      } else if (this.zIndexMap.has(o.id)) {
        renderSortCompValue.set(
          o.id,
          this.zIndexMap.get(o.id)! * layerValueStep,
        );
      } else {
        // Todo handle sorting of dynamic sprites that moves in the world by using their collisions with other objects.
        renderSortCompValue.set(o.id, o.pos.y);
      }
    }

    // Handle edge cases for when human is behind stuff

    for (const s of this.skaters) {
      const currAction = s.getCurrentAction();

      const obstacle = this.obstacles.find(
        (o2) => o2.id === currAction.targetId,
      );

      // Skater is currently at obstacle ramp and climbing it from behind so we need to increase the 'y' value to sort on so that it will be rendered first, i.e. the ramp will be rendered on top of this skater.
      if (obstacle !== undefined) {
        if (obstacle.type === "ramp") {
          const isBehindRamp =
            s.pos.y <= obstacle.pos.y + BEHIND_RAMP_OFFSET * this.art!.tileSize;
          const isClimbing = currAction.currentAction === "climb-ramp";
          const objSort = this.zIndexMap.get(obstacle.id)! * layerValueStep;
          if (isBehindRamp && isClimbing) {
            renderSortCompValue.set(s.id, objSort - 1);
          } else {
            renderSortCompValue.set(s.id, objSort);
          }
          continue;
        }
      }

      const bench = this.benches.find((o2) => o2.id === currAction.targetId);

      if (bench !== undefined) {
        const objSort = this.zIndexMap.get(bench.id)! * layerValueStep;
        renderSortCompValue.set(s.id, objSort + 4);
        continue;
      }

      const ramp = this.obstacles.find((o) => o.type === "ramp")!;

      // Skater is in the area behind the ramp cruising or some
      if (
        s.pos.y >= ramp.pos.y &&
        s.pos.y <= ramp.pos.y + BEHIND_RAMP_OFFSET * this.art!.tileSize &&
        s.pos.x >= ramp.pos.x - this.art!.tileSize &&
        s.pos.x <= ramp.pos.x + ramp.width + this.art!.tileSize
      ) {
        const objSort = this.zIndexMap.get(ramp.id)! * layerValueStep;
        renderSortCompValue.set(s.id, objSort - 1);
        continue;
      }
      renderSortCompValue.set(s.id, s.pos.y);
    }

    this.sortObjects((s1, s2) => {
      const v1 = renderSortCompValue.get(s1.id);
      const v2 = renderSortCompValue.get(s2.id);
      if (v1 === undefined || v2 === undefined) {
        console.log("Render sort error");
        return 0;
      }

      return v1 - v2;
    });
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

  async init(shadow: { width: number; height: number; pos: Vec2 }) {
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
