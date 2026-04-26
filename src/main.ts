import tilemapJSON from "./tilemap.json";
import "./style.css";
import { Art } from "./lib";
import Play from "./Play";
import Pause from "./Pause";
import { RenderMode } from "./lib/Art";
import type { Tilemap } from "./types";

(async () => {
  const tilemap: Tilemap = tilemapJSON as unknown as Tilemap;

  const art = new Art({
    displayGrid: false,
    height: tilemap.height,
    width: tilemap.width,
    mode: RenderMode.PIXI,
    tileSize: tilemap.tileSize,
    container: "#pixi-container",
    play: new Play(tilemap),
    pause: new Pause(),
    scale: "4k"
  });

  await art.init();
  art.play();

})();
