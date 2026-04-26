import { AmbientSprite, Scene, ShaderObject, StaticImage,type  Vec2 } from "./lib";
import { type Tilemap } from "./types";
import skaterJSON from "./skater-spritesheet.json";
import shorelineJSON from "./shoreline.json";
import { type AsepriteJSON } from "./lib/index";
import { loadShader } from "./lib/utils";
import {
  Color,
  Filter,
  GlProgram,
  Graphics,
  UniformGroup,
} from "pixi.js";



const color1 = new Color("#1d0c24");
const color2 = new Color("#63415f");
const color3 = new Color("#ce9685");
const color4 = new Color("#e8dcc1");

export default class Play extends Scene {
  private tilemap: Tilemap;
  private water!: Water;

  constructor(tilemap: Tilemap) {
    super();
    this.tilemap = tilemap;
  }

  async init(): Promise<void> {
    
    if (this.art === null) throw new Error("Art is null");

    this.art.textures.add("skater", "assets/skater-spritesheet.png");
    this.art.textures.add("shoreline", "assets/shoreline.png");
    this.art.textures.add("bg", this.tilemap.tilemap);

    for (const o of this.tilemap.objects) {
      this.art.textures.add(o.name, o.image);
    }

    await this.art.textures.load();

    this.art.spritesheets.create(
      "skater",
      "skater",
      skaterJSON as AsepriteJSON,
    );
    this.art.spritesheets.create(
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

    const bg = new StaticImage(this, { x: 0, y: 0 }, this.art.width, this.art.height, "bg");
    this.addObject(bg);

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
    }

    for (const o of this.tilemap.objects) {
      this.addObject(new StaticImage(this, o.pos, o.width, o.height, o.name));
    }


    addEventListener("keydown", (e) => {
      if (e.key.toLowerCase() === "f") {
        this.art!.enterFullScreen();
      }
    });
  }

  update(dt: number) {
    super.update(dt);

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
