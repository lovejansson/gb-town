import { createPathAStar } from "./grid.ts";
import type Human from "./Human.ts";
import type { Cell, Direction, Vec2 } from "./lib/types.ts";
import { cellToPos, getPosDiff, posToCell } from "./utils.ts";

// Get direction diff for x and why and use that as index to get label for direction. directionLables[y + 1][x + 1]
const directionLables = [
  ["nw", "n", "ne"],
  ["w", "curr", "e"],
  ["sw", "s", "se"],
];

/**
 * A path that a sprite can move on. Handles creation of path on the grid and updating of position (x,y).
 * You need to create a new instance whenever a sprite should walk on a path.
 * Supports 8 directional walks.
 */
export class Path {
  hasReachedGoal: boolean;
  cellCount: number;

  private currCellStart: Vec2;
  private path: Cell[];
  private currPathIdx;
  private goalCell: Cell;
  private sprite: Human;

  constructor(sprite: Human, goal: Vec2, grid: (0 | 1)[][]) {
    this.sprite = sprite;
    this.goalCell = posToCell(goal, sprite.scene.art!.tileSize);

    this.path = createPathAStar(
      posToCell(this.sprite.pos, this.sprite.scene.art!.tileSize),
      this.goalCell,
      grid,
    );

    this.currCellStart = { ...this.sprite.pos };
    this.currPathIdx = 0;
    this.hasReachedGoal = this.path.length <= 1;
    this.cellCount = 0;
  }

  update(_: number) {
    if (!this.hasReachedGoal) {
      this.updateVelocity();
      this.updateDirection();

      const diff = getPosDiff(this.sprite.pos, this.currCellStart);
      const tileSize = this.sprite.scene.art!.tileSize;

      const hasReachedStepX =
        this.sprite.vel.x === 0 ||
        Math.sign(diff.x) === Math.sign(this.sprite.vel.x) &&
          Math.abs(diff.x) >= tileSize;
      const hasReachedStepY =
        this.sprite.vel.y === 0 ||
        Math.sign(diff.y) === Math.sign(this.sprite.vel.y) &&
          Math.abs(diff.y) >= tileSize;

      if (hasReachedStepX && hasReachedStepY) {
        this.snapToNextCell();
        this.next();
      }
    }
  }

  private snapToNextCell() {
    if (this.currPathIdx + 1 >= this.path.length) return;

    const nextCell = this.path[this.currPathIdx + 1];
    const nextPos = cellToPos(nextCell, this.sprite.scene.art!.tileSize);

    this.sprite.pos.x = nextPos.x;
    this.sprite.pos.y = nextPos.y;
  }

  private next() {
    this.currPathIdx++;
    this.cellCount++;

    this.currCellStart = { ...this.sprite.pos };

    if (this.currPathIdx === this.path.length - 1) {
      this.hasReachedGoal = true;
    }
  }

  /**
   * Calcualtes the xy diff to use when updating the sprite's velocity by comparing
   * the placement of the current cell and the next or previous cell.
   */
  private calculateVelocity(): Vec2 {
    const currCell = this.path[this.currPathIdx];

    if (this.currPathIdx === this.path.length - 1) {
      const prev = this.path[this.currPathIdx - 1];
      return { y: currCell.row - prev.row, x: currCell.col - prev.col };
    } else {
      const next = this.path[this.currPathIdx + 1];
      return { x: next.col - currCell.col, y: next.row - currCell.row };
    }
  }

  private updateDirection(): void {
    (this.sprite).direction = directionLables[this.sprite.vel.y + 1][
      this.sprite.vel.x + 1
    ] as Direction;
  }

  private updateVelocity(): void {
    const vel = this.calculateVelocity();
    this.sprite.vel.x = vel.x;
    this.sprite.vel.y = vel.y;
  }
}
