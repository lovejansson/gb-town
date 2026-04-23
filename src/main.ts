import {
  AnimatedSprite,
  Application,
  Assets,
  Color,
  Filter,
  GlProgram,
  Graphics,
  UniformGroup,
  Texture,
  Spritesheet,
  Sprite,
  Container,
} from "pixi.js";

import { AsepriteJSON, convertAsepriteToPixie } from "./spritesheet";
import shorelineJSON from "./shoreline.json";
import tilemapJSON from "./tilemap.json";
import "./style.css";
import { Tilemap } from "./types";
import { createTextureFromBase64 } from "./utils";

const tilemap: Tilemap = tilemapJSON as unknown as Tilemap;

const ShoreLinePixieJSON = convertAsepriteToPixie(
  shorelineJSON as AsepriteJSON,
);

async function loadShader(src: string): Promise<string> {
  try {
    const shader = await fetch(src);
    const text = await shader.text();
    return text;
  } catch (e) {
    console.error(e);
    throw new Error("Failed to load shader, view error logs");
  }
}

(async () => {
  const pointVelocities = [1, 1, 1, 1, -1, -1, -1, -1];
  let pvIdx = 0;
  let translate = 0;
  const color1 = new Color("#1d0c24");
  const color2 = new Color("#63415f");
  const color3 = new Color("#ce9685");
  const color4 = new Color("#e8dcc1");

  const tileSize = tilemap.tileSize;
  const worldWidth = tilemap.width;
  const worldHeight = tilemap.height;

  const waterTile = tilemap.attributes.find((a) =>
    a.attributes.hasOwnProperty("isWaterTopLeft"),
  );

  if (waterTile === undefined) throw new Error("water start tile not exported");

  const waterWidth = parseInt(waterTile.attributes["width"]);
  const waterHeight = parseInt(waterTile.attributes["height"]);

  const app = new Application();

  await app.init({
    roundPixels: true,
    preference: "webgl",
    width: worldWidth,
    height: worldHeight,
    resolution: 1,
    background: "red",
  });

  const pixieContainer = document.getElementById("pixi-container")!;

  pixieContainer.appendChild(app.canvas);

  app.canvas.style.width = `${screen.width}px`;
  app.canvas.style.height = `${screen.height}px`;

  const world = new Container();

  app.stage.addChild(world);

  const shorelineTex: Texture = await Assets.load("assets/shoreline.png");

  const tilemapTex = await createTextureFromBase64(tilemap.tilemap);

  const staticBg = new Sprite(tilemapTex);

  world.addChild(staticBg);

  shorelineTex.source.scaleMode = "nearest";

  const shorelineSpritesheet = new Spritesheet(
    shorelineTex,
    ShoreLinePixieJSON,
  );

  await shorelineSpritesheet.parse();

  const shorelineAnimation = shorelineSpritesheet.animations["shoreline"].map(
    (texture, _) => ({
      texture,
      time: shorelineSpritesheet.data.frames[texture.label!].duration,
    }),
  );

  

  const objectsWithTextures = await Promise.all(
    tilemap.objects.map(async (o) => ({
      ...o,
      tex: await createTextureFromBase64(o.image),
    })),
  );

  const objects: Sprite[] = [];

  let dock;

  for (const o of objectsWithTextures) {
    if (o.name === "dock") dock = o;

    const sprite = new Sprite({
      texture: o.tex,
      x: o.pos.x,
      y: o.pos.y,
      width: o.width,
      height: o.height,
    });

    objects.push(sprite);
  }

  const fragment = await loadShader("/water.frag");
  const vertex = await loadShader("/water.vert");

  const waveFilter = new Filter({
    glProgram: new GlProgram({
      name: "water-waves",
      fragment,
      vertex,
    }),
    resources: {
      uniforms: new UniformGroup({
        uTime: { value: 0.0, type: "f32" },
        uDockShadowPos: {
          value: new Float32Array([dock!.pos.x, 0]),
          type: "vec2<f32>",
        },
        uDockShadowWidth: { value: dock!.width, type: "f32" },
        uDockShadowHeight: { value: 4 * tileSize, type: "f32" },
        uWaveColor: { value: color3, type: "vec3<f32>" },
        uWaterColor: { value: color2, type: "vec3<f32>" },
        uWaterColorShadow: { value: color1, type: "vec3<f32>" },
        uWaveColorShadow: { value: color2, type: "vec3<f32>" },
        uResolution: {
          value: new Float32Array([waterWidth, waterHeight]),
          type: "vec2<f32>",
        },
        uTranslate: {
          value: translate,
          type: "f32",
        },
      }),
    },
  });

  const water = new Graphics()
    .rect(0, waterTile.pos.y, waterWidth, waterHeight)
    .fill("#63415f");

  water.filters = [waveFilter];
  world.addChild(water);
  for (let i = 0; i < 14; ++i) {
    const sl = new AnimatedSprite(shorelineAnimation);
    sl.position.y = waterTile.pos.y - tileSize;
    sl.position.x = i * shorelineSpritesheet.data.frames["shoreline-0"].frame.w;
    sl.play();

    
    world.addChild(sl);
  }

  for (const o of objects) {
    world.addChild(o);
  }

  let frame = 0;

  app.ticker.add((time) => {
    frame += time.deltaMS;

    if (frame >= 150) {
      frame = 0;
      translate += pointVelocities[pvIdx];

      water.translateTransform(translate);

      pvIdx++;

      waveFilter.resources.uniforms.uniforms.uTranslate = translate;
    }

    waveFilter.resources.uniforms.uniforms.uTime += 0.01;

    if (pvIdx === pointVelocities.length) {
      pvIdx = 0;
      translate = 0;
    }
  });
  addEventListener("keydown", (e) => {
    if (e.key === "f") {
      pixieContainer.requestFullscreen();
    }
  });
})();
