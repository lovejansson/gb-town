import type Play from "../Play";
import Skater from "../Human";
import { randomBool, randomEl, randomInt } from "../utils";
import { Path } from "../path";
import Timer, { FIVE_MINUTES, TEN_MINUTES } from "../Timer";
import Obstacle, {
  obstacles,
  obstacleTricks,
  tricks,
  type ObstacleType,
  type Trick,
  Ramp,
  RampSide,
} from "./Obstacle";
import {
  AnimationSequence,
  TransitionType,
  type SequenceAnimation,
} from "../lib";
import type { Direction, Vec2 } from "../lib";

import { getBoardCarryOverlay, getBoardFlipOverlay } from "../Human";
import type Bench from "./Bench";
import { createAction, type ActionTag, type Updatable } from "../actions";

export default class SkatingAtPark implements SkateUpdatable {
  static tag: "skating-at-park" = "skating-at-park";
  readonly tag: "skating-at-park" = SkatingAtPark.tag;

  private skater: Skater;
  private tricks: Trick[];
  private obstacles: ObstacleType[];
  private currAction: SkateUpdatable | null;
  private obstacle: Obstacle | null;
  private bench: Bench | null;
  private tileSize: number;

  private transitionToAction(
    nextAction: SkateUpdatable,
    actionNode: {
      parentAction: ActionTag;
      currentAction: ActionTag;
      targetId: number | null;
      reason: string | null;
    },
  ) {
    if (this.currAction !== null) {
   
      this.skater.utility.popAction();
    }

    this.currAction = nextAction;
    this.skater.utility.pushAction(actionNode);
    this.currAction.init();
  }

  constructor(skater: Skater) {
    this.skater = skater;
    this.tileSize = this.skater.tileSize;
    this.tricks = tricks.slice(0, skater.skill - 1);
    this.obstacles = obstacles.filter((o) =>
      obstacleTricks[o].some((t1) => this.tricks.includes(t1)),
    );

    this.currAction = null;
    this.obstacle = null;
    this.bench = null;
  }

  init() {}

  update(dt: number): void {
    if (this.currAction === null) {
      const firstAction = randomEl(["bench", "flat", "ramp"]);

      switch (firstAction) {
        case "bench":
          this.bench = randomEl(
            (this.skater.scene as Play).benches.filter((o) => o.isFree),
          )!;

          this.bench.isFree = false;

          this.obstacle = null;

          this.transitionToAction(
            createAction(CruiseTo.TAG, this.skater, {
              x: this.bench.pos.x,
              y: this.bench.pos.y + this.tileSize,
            }),
            {
              parentAction: this.tag,
              currentAction: CruiseTo.TAG,
              targetId: this.bench.id,
              reason: "initial choice was bench; cruising to sit spot",
            },
          );

          break;

        case "flat":
          this.obstacle = (this.skater.scene as Play).obstacles.find(
            (o) => o.type === "flat",
          )!;
          this.obstacle.arrive(this.skater.id);

          this.transitionToAction(
            createAction(
              CruiseTo.TAG,
              this.skater,
              this.obstacle!.getArrivePos(
                this.obstacle!.type === "ramp"
                  ? (this.obstacle as Ramp).getMyIdlePos(this.skater.id)
                  : this.skater.pos,
              ),
            ),
            {
              parentAction: this.tag,
              currentAction: CruiseTo.TAG,
              targetId: this.obstacle.id,
              reason: "initial choice was flat obstacle; cruising to arrive point",
            },
          );
          break;
        case "ramp":
          this.obstacle = (this.skater.scene as Play).obstacles.find(
            (o) => o.type === "ramp",
          )!;
          this.obstacle.arrive(this.skater.id);

          this.transitionToAction(
            createAction(
              CruiseTo.TAG,
              this.skater,
              this.obstacle!.getArrivePos(
                this.obstacle!.type === "ramp"
                  ? (this.obstacle as Ramp).getMyIdlePos(this.skater.id)
                  : this.skater.pos,
              ),
            ),
            {
              parentAction: this.tag,
              currentAction: CruiseTo.TAG,
              targetId: this.obstacle.id,
              reason: "initial choice was ramp obstacle; cruising to arrive point",
            },
          );
          break;
      }
    } else if (this.currAction.isComplete()) {
      const completedActionTag = this.currAction.tag;
      this.skater.utility.popAction();
      this.currAction = null;

      if (completedActionTag === CruiseTo.TAG) {
        if (this.obstacle !== null) {
          switch (this.obstacle.type) {
            case "flat":
              this.transitionToAction(
                createAction(
                  this.obstacle.type,
                  this.skater,
                  this.obstacle as Obstacle,
                  TEN_MINUTES,
                ),
                {
                  parentAction: this.tag,
                  currentAction: this.obstacle.type,
                  targetId: this.obstacle.id,
                  reason: "reached obstacle; start flat skating routine",
                },
              );
              break;
            case "ramp":
              this.transitionToAction(
                createAction(
                  this.obstacle.type,
                  this.skater,
                  this.obstacle as Ramp,
                  TEN_MINUTES,
                ),
                {
                  parentAction: this.tag,
                  currentAction: this.obstacle.type,
                  targetId: this.obstacle.id,
                  reason: "reached obstacle; start ramp skating routine",
                },
              );
              break;
          }
        } else if (this.bench !== null) {
          this.transitionToAction(
            createAction(
              SittingBench.TAG,
              this.skater,
              this.bench,
              FIVE_MINUTES,
            ),
            {
              parentAction: this.tag,
              currentAction: SittingBench.TAG,
              targetId: this.bench.id,
              reason: "reached bench; switching to resting action",
            },
          );
        } else {
          throw new Error("Invalid state: bench and obstacle is null");
        }
      } else {
        if (completedActionTag === SittingBench.TAG) {
          this.bench!.isFree === true;
          this.bench = null;
        } else {
          this.obstacle = null;
        }
        const hasFreeObstacles =
          (this.skater.scene as Play).obstacles.find(
            (o) => !o.isTooCrowded() && this.obstacles.includes(o.type),
          ) !== undefined;
        const hasFreeBenches = (this.skater.scene as Play).benches.find(
          (b) => b.isFree,
        );

        const willSkate = randomBool() && hasFreeObstacles;

        if (willSkate) {
          for (let i = 0; i < this.obstacles.length; ++i) {
            const obstacleType = randomEl(this.obstacles);
            this.obstacle = (this.skater.scene as Play).obstacles.find(
              (o) => o.type === obstacleType,
            )!;
            if (!this.obstacle.isTooCrowded()) break;
          }

          if (this.obstacle && this.obstacle.isTooCrowded()) {
            return;
          }

          this.obstacle!.arrive(this.skater.id);

          this.transitionToAction(
            createAction(
              CruiseTo.TAG,
              this.skater,
              this.obstacle!.getArrivePos(
                this.obstacle!.type === "ramp"
                  ? (this.obstacle as Ramp).getMyIdlePos(this.skater.id)
                  : this.skater.pos,
              ),
            ),
            {
              parentAction: this.tag,
              currentAction: CruiseTo.TAG,
              targetId: this.obstacle!.id,
              reason: "chose to keep skating and found an available obstacle",
            },
          );
        } else if (hasFreeBenches) {
          this.bench = randomEl(
            (this.skater.scene as Play).benches.filter((o) => o.isFree),
          )!;

          this.bench.isFree = false;
          this.obstacle = null;

          this.transitionToAction(
            createAction(CruiseTo.TAG, this.skater, {
              x: this.bench.pos.x,
              y: this.bench.pos.y + this.tileSize,
            }),
            {
              parentAction: this.tag,
              currentAction: CruiseTo.TAG,
              targetId: this.bench!.id,
              reason: "no skate target picked; moving to an available bench",
            },
          );
        }
      }
    }

    if (this.currAction !== null) this.currAction.update(dt);
  }

  isComplete(): boolean {
    return false;
  }
}

class FlatObstacle implements SkateUpdatable {
  static tag: "flat" = "flat";
  readonly tag: "flat" = FlatObstacle.tag;
  private skater: Skater;
  private animationSeq: AnimationSequence;
  private timer: Timer;

  constructor(skater: Skater, obstacle: Obstacle, ms: number) {
    this.skater = skater;
    this.skater.direction = randomEl(["s", "n"]) as Direction;

    this.animationSeq = new AnimationSequence(
      this.skater,
      FlatObstacle.CreateAnimationSequence(this.skater.direction),
    );
    this.timer = new Timer();
    this.timer.start(ms);

    this.animationSeq.start();
  }

  init() {}

  update(dt: number) {
    this.animationSeq.update(dt);
    if (this.animationSeq.isFinished) {
      this.animationSeq = new AnimationSequence(
        this.skater,
        FlatObstacle.CreateAnimationSequence(this.skater.direction),
      );

      this.animationSeq.start();
    }
  }

  isComplete(): boolean {
    return this.timer.isStopped;
  }

  static CreateAnimationSequence(direction: Direction): SequenceAnimation[] {
    const trick = randomEl(obstacleTricks["flat"]);

    const flipside = direction === "n" ? "b" : "f";

    const seq: SequenceAnimation[] = [
      AnimationSequence.createAnim({
        anim: `idle-stand-board-${direction}`,
        type: TransitionType.Time,
        transition: { duration: 2000 },
      }),
      AnimationSequence.createAnim({
        anim: `prep-${direction}`,
        type: TransitionType.Finished,
        transition: null,
      }),
      AnimationSequence.createAnim({
        anim: `${trick?.includes("shove-it") ? "shove-it" : trick}-${flipside}`,
        type: TransitionType.Finished,
        transition: null,
      }),
    ];

    return seq;
  }
}

/**
 * Skater has already arrived at the correct position at the ramp obstacle here, so this
 * class simply moves the skater up the ramp!
 */
class ClimbRamp implements SkateUpdatable {
  static tag: "climb-ramp" = "climb-ramp";
  readonly tag: "climb-ramp" = ClimbRamp.tag;

  private skater: Skater;
  private obstacle: Ramp;
  private animationSequence: AnimationSequence;
  private tileSize: number;
  private rampSide: RampSide;

  constructor(
    skater: Skater,
    obstacle: Ramp,
    rampSide: RampSide,
    climbUp: boolean,
  ) {
    this.skater = skater;

    this.obstacle = obstacle;
    this.tileSize = this.skater.tileSize;
    this.rampSide = rampSide;
    this.skater.direction = climbUp ? "n" : "s";
    this.skater.vel.y = climbUp ? -1 : 1;

    switch (this.rampSide) {
      case RampSide.TOP_LEFT:
        this.animationSequence = new AnimationSequence(
          this.skater,
          [
            AnimationSequence.createAnim({
              type: TransitionType.Distance,
              anim: "walk-board-s",
              options: { overlay: getBoardCarryOverlay("n", false) },
              transition: { dx: 0, dy: this.tileSize * 2 * this.skater.vel.y },
            }),
          ],
          (anim: string) => {
            console.log("WOOP AN ANIM ?", anim);
          },
        );
        break;
      case RampSide.TOP_RIGHT:
        this.animationSequence = new AnimationSequence(this.skater, [
          AnimationSequence.createAnim({
            type: TransitionType.Distance,
            anim: "walk-board-s",
            options: { overlay: getBoardCarryOverlay("s", false) },
            transition: { dx: 0, dy: this.tileSize * 2 * this.skater.vel.y },
          }),
        ]);
        break;
      case RampSide.BOTTOM_RIGHT:
      case RampSide.BOTTOM_LEFT:
        const seq = [
          AnimationSequence.createAnim({
            type: TransitionType.Distance,
            anim: `walk-board-${this.skater.direction}`,
            options: { overlay: getBoardCarryOverlay("n", false) },
            transition: { dx: 0, dy: this.tileSize * this.skater.vel.y },
          }),

          AnimationSequence.createAnim({
            type: TransitionType.Distance,
            anim: climbUp ? "climb-up" : "climb-down",
            options: { overlay: getBoardCarryOverlay("n", false) },
            transition: { dx: 0, dy: this.tileSize * 2 * this.skater.vel.y },
          }),
        ];

        if (!climbUp) {
          seq.reverse();
        }
        this.animationSequence = new AnimationSequence(this.skater, seq);
        break;
    }

    this.animationSequence.start();
  }

  init() {}

  update(dt: number): void {
    if (this.animationSequence.isFinished) {
      this.skater.direction = (() => {
        switch (this.rampSide) {
          case RampSide.TOP_LEFT:
          case RampSide.BOTTOM_LEFT:
            return "e";
          case RampSide.BOTTOM_RIGHT:
          case RampSide.TOP_RIGHT:
            return "w";
        }
      })();
      if (
        !this.skater.animations.isPlaying(`idle-stand-${this.skater.direction}`)
      ) {
        this.skater.animations.play(`idle-stand-${this.skater.direction}`, {
          overlay: getBoardCarryOverlay(this.skater.direction, true),
        });
      }
    }

    this.animationSequence.update(dt);
  }

  isComplete(): boolean {
    return this.skater.animations.isPlaying(
      `idle-stand-${this.skater.direction}`,
    );
  }
}

export class RampObstacle implements SkateUpdatable {
  static tag: "ramp" = "ramp";
  readonly tag: "ramp" = RampObstacle.tag;
  private skater: Skater;
  private timer: Timer;
  private currAction: null | SkateUpdatable;
  private obstacle: Ramp;
  private start: { pos: Vec2; rampSide: RampSide };
  private end: { pos: Vec2; rampSide: RampSide };

  private transitionToAction(
    nextAction: SkateUpdatable,
    actionNode: {
      parentAction: ActionTag;
      currentAction: ActionTag;
      targetId: number | null;
      reason: string | null;
    },
  ) {
    if (this.currAction !== null) {
      this.skater.utility.popAction();
    }

    this.currAction = nextAction;
    this.skater.utility.pushAction(actionNode);
    this.currAction.init();
  }

  constructor(skater: Skater, obstacle: Ramp, ms: number) {
    this.skater = skater;

    this.timer = new Timer();
    this.timer.start(ms);
    this.currAction = null;
    this.obstacle = obstacle;

    const idlePos = this.obstacle.getMyIdlePos(this.skater.id);
    const rampSide = this.obstacle.getIdlePosSide(this.skater.id);

    this.start = { pos: idlePos, rampSide };
    this.end = { pos: idlePos, rampSide };
  }

  init() {}

  update(dt: number): void {
    if (this.currAction === null) {
      this.transitionToAction(
        createAction(
          ClimbRamp.tag,
          this.skater,
          this.obstacle,
          this.start.rampSide,
          true,
        ),
        {
          parentAction: this.tag,
          currentAction: ClimbRamp.tag,
          targetId: this.obstacle.id,
          reason: "starting ramp session by climbing to drop-in position",
        },
      );
    } else if (this.currAction.isComplete()) {
      const completedActionTag = this.currAction.tag;
      this.skater.utility.popAction();
      this.currAction = null;

      if (this.timer.isStopped) {
        this.setSkaterPosBeforeClimbDown();
        this.transitionToAction(
          createAction(
            ClimbRamp.tag,
            this.skater,
            this.obstacle,
            this.start.rampSide,
            false,
          ),
          {
            parentAction: this.tag,
            currentAction: ClimbRamp.tag,
            targetId: this.obstacle.id,
            reason: "session timer ended; climbing down to exit ramp",
          },
        );
      } else {
        if (completedActionTag === ClimbRamp.tag) {
          this.obstacle.standInLine(this.skater.id);
          this.setSkaterPosBeforeWaitMyTurn();
          this.transitionToAction(
            createAction(WaitingMyTurn.TAG, this.skater, this.obstacle),
            {
              parentAction: this.tag,
              currentAction: WaitingMyTurn.TAG,
              targetId: this.obstacle.id,
              reason: "finished climb; waiting in line for next turn",
            },
          );
        } else if (completedActionTag === WaitingMyTurn.TAG) {
          // After WaitingMyTurn we got a new idle position assigned to the skater where they should end the round

          const idlePos = this.obstacle.getMyIdlePos(this.skater.id);
          const rampSide = this.obstacle.getIdlePosSide(this.skater.id);

          this.end = { pos: idlePos, rampSide };

          this.transitionToAction(
            createAction(
              RampTricks.TAG,
              this.skater,
              this.obstacle,
              this.start,
              this.end,
            ),
            {
              parentAction: this.tag,
              currentAction: RampTricks.TAG,
              targetId: this.obstacle.id,
              reason: "turn granted; begin ramp trick run",
            },
          );
        } else if (completedActionTag === RampTricks.TAG) {
          this.obstacle.endSkate(this.skater.id);
          this.obstacle.standInLine(this.skater.id);

          // After skater is done, the "end" side is now the new start side.
          this.start = { ...this.end };

          this.setSkaterPosBeforeWaitMyTurn();
          this.transitionToAction(
            createAction(WaitingMyTurn.TAG, this.skater, this.obstacle),
            {
              parentAction: this.tag,
              currentAction: WaitingMyTurn.TAG,
              targetId: this.obstacle.id,
              reason: "completed run; rejoin queue for another turn",
            },
          );
        }
      }
    }

    if (this.currAction !== null) this.currAction.update(dt);
  }

  private setSkaterPosBeforeWaitMyTurn() {
    this.skater.direction = (() => {
      switch (this.start.rampSide) {
        case RampSide.TOP_LEFT:
        case RampSide.BOTTOM_LEFT:
          return "e";
        case RampSide.BOTTOM_RIGHT:
        case RampSide.TOP_RIGHT:
          return "w";
      }
    })();

    const fenceDiffX = (() => {
      switch (this.start.rampSide) {
        case RampSide.TOP_LEFT:
        case RampSide.BOTTOM_LEFT:
          return 1;
        case RampSide.BOTTOM_RIGHT:
        case RampSide.TOP_RIGHT:
          return -1;
      }
    })();

    this.skater.pos.x = this.start.pos.x + fenceDiffX;
    this.skater.pos.y = this.obstacle.getMyIdlePos(this.skater.id).y;
  }

  private setSkaterPosBeforeClimbDown() {
    const idlePos = this.obstacle.getMyIdlePos(this.skater.id);
    this.skater.pos.x = idlePos.x;
    this.skater.pos.y = idlePos.y;
  }

  isComplete(): boolean {
    return (
      this.timer.isStopped &&
      this.currAction?.tag === ClimbRamp.tag &&
      this.currAction.isComplete()
    );
  }
}

class RampTricks implements SkateUpdatable {
  static TAG: "ramp-tricks" = "ramp-tricks";
  readonly tag: "ramp-tricks" = RampTricks.TAG;

  private obstacle: Obstacle;
  private skater: Skater;
  private animationSequence: AnimationSequence;
  private tileSize: number;

  private start: { pos: Vec2; rampSide: RampSide };
  private end: { pos: Vec2; rampSide: RampSide };

  constructor(
    skater: Skater,
    obstacle: Obstacle,
    start: { pos: Vec2; rampSide: RampSide },
    end: { pos: Vec2; rampSide: RampSide },
  ) {
    this.skater = skater;

    this.tileSize = this.skater.tileSize;
    this.obstacle = obstacle;

    this.start = start;
    this.end = end;
    this.skater.pos.x += (() => {
      switch (this.start.rampSide) {
        case RampSide.TOP_LEFT:
        case RampSide.BOTTOM_LEFT:
          return 1;
        case RampSide.BOTTOM_RIGHT:
        case RampSide.TOP_RIGHT:
          return -1;
      }
    })();

    const trickSet = RampTricks.TrickSet(
      this.start.rampSide,
      this.end.rampSide,
      randomInt(1, 10),
    );

    this.animationSequence = new AnimationSequence(this.skater, [
      AnimationSequence.createAnim({
        anim: `walk-board-${(() => {
          switch (this.start.rampSide) {
            case RampSide.TOP_LEFT:
            case RampSide.TOP_RIGHT:
              return "s";
            case RampSide.BOTTOM_RIGHT:
            case RampSide.BOTTOM_LEFT:
              return "n";
          }
        })()}`,
        options: {
          overlay: getBoardCarryOverlay(
            (() => {
              switch (this.start.rampSide) {
                case RampSide.TOP_LEFT:
                case RampSide.TOP_RIGHT:
                  return "s";
                case RampSide.BOTTOM_RIGHT:
                case RampSide.BOTTOM_LEFT:
                  return "n";
              }
            })(),
            false,
          ),
        },
        type: TransitionType.Distance,
        transition: {
          dy:
            this.tileSize *
            1.5 *
            (() => {
              switch (this.start.rampSide) {
                case RampSide.TOP_LEFT:
                case RampSide.TOP_RIGHT:
                  return 1;
                case RampSide.BOTTOM_RIGHT:
                case RampSide.BOTTOM_LEFT:
                  return -1;
              }
            })(),
          dx: 0,
        },
      }),
      ...trickSet.map((t) =>
        AnimationSequence.createAnim({
          anim: t,
          type: TransitionType.Finished,
          transition: null,
          options: t.includes("land")
            ? {
                overlay: getBoardCarryOverlay(
                  t.includes("-w") ? "w" : "e",
                  true,
                ),
              }
            : undefined,
        }),
      ),
      AnimationSequence.createAnim({
        anim: `walk-board-${(() => {
          switch (this.end.rampSide) {
            case RampSide.TOP_LEFT:
            case RampSide.TOP_RIGHT:
              return "n";
            case RampSide.BOTTOM_RIGHT:
            case RampSide.BOTTOM_LEFT:
              return "s";
          }
        })()}`,
        options: {
          overlay: getBoardCarryOverlay(
            (() => {
              switch (this.end.rampSide) {
                case RampSide.TOP_LEFT:
                case RampSide.TOP_RIGHT:
                  return "n";
                case RampSide.BOTTOM_RIGHT:
                case RampSide.BOTTOM_LEFT:
                  return "s";
              }
            })(),
            false,
          ),
        },
        type: TransitionType.Distance,
        transition: {
          dy:
            this.tileSize *
            1.5 *
            (() => {
              switch (this.end.rampSide) {
                case RampSide.TOP_LEFT:
                case RampSide.TOP_RIGHT:
                  return -1;
                case RampSide.BOTTOM_RIGHT:
                case RampSide.BOTTOM_LEFT:
                  return 1;
              }
            })(),
          dx: 0,
        },
      }),
    ]);

    this.animationSequence.start();
  }

  init() {}

  update(dt: number): void {
    this.animationSequence.update(dt);
    if (this.animationSequence.getCurrentAnimation().name === "walk-board-n") {
      this.skater.vel.y = -1;
      this.skater.direction = "n";
    } else if (
      this.animationSequence.getCurrentAnimation().name === "walk-board-s"
    ) {
      this.skater.direction = "s";
      this.skater.vel.y = 1;
    }
  }

  isComplete(): boolean {
    return this.animationSequence.isFinished;
  }

  static TrickSet(startSide: RampSide, endSide: RampSide, numTricks: number) {
    type Direction = "e" | "w";
    type Flipside = "f" | "b";

    const set: string[] = [];

    const startDirection: Direction = (() => {
      switch (startSide) {
        case RampSide.TOP_LEFT:
        case RampSide.BOTTOM_LEFT:
          return "e";
        case RampSide.TOP_RIGHT:
        case RampSide.BOTTOM_RIGHT:
          return "w";
      }
    })();

    const endDirection: Direction = (() => {
      switch (endSide) {
        case RampSide.TOP_LEFT:
        case RampSide.BOTTOM_LEFT:
          return "e";
        case RampSide.TOP_RIGHT:
        case RampSide.BOTTOM_RIGHT:
          return "w";
      }
    })();

    let direction: Direction = startDirection;

    let flipside: Flipside = "f";

    set.push(`cruise-ramp-${flipside}-${direction}`);

    for (let i = 0; i < numTricks; ++i) {
      const trick = randomEl(obstacleTricks.ramp)!;

      if (trick === "180") {
        set.push(`180-${flipside}`);
        flipside === "f" ? "b" : "f";
      } else if (trick === "360") {
        set.push(`360-${flipside}`);
      } else if (trick === "grab") {
        set.push(`grab-${flipside}`);
      }

      direction = direction === "e" ? "w" : "e";
      set.push(`cruise-ramp-${flipside}-${direction}`);

      if (i === numTricks - 1 && direction === endDirection) {
        direction = direction === "e" ? "w" : "e";
        set.push(`cruise-ramp-${flipside}-${direction}`);
      }
    }

    set.push(`ramp-land-${direction}`);

    return set;
  }
}

class CruiseTo implements SkateUpdatable {
  static TAG: "cruise-to" = "cruise-to";
  readonly tag: "cruise-to" = CruiseTo.TAG;

  skater: Skater;
  path: Path;
  private animSeq: AnimationSequence | null;

  constructor(skater: Skater, to: Vec2) {
    this.skater = skater;

    
    this.path = new Path(this.skater, to, (this.skater.scene as Play).grid);
    if (this.skater.direction === "e") {
      this.skater.animations.play(`cruise-b-${this.skater.direction}`);
    } else if (this.skater.direction === "w") {
      this.skater.animations.play(`cruise-f-${this.skater.direction}`);
    } else {
      this.skater.animations.play(`cruise-${this.skater.direction}`);
    }


  
    this.animSeq = null;
  }

  init() {}

  update(dt: number): void {
    if (this.path.hasReachedGoal) {
      if (!this.animSeq) {
        this.animSeq = new AnimationSequence(
          this.skater,
          [
            AnimationSequence.createAnim({
              anim: `flip-${this.skater.direction}`,
              type: TransitionType.Finished,
              transition: null,
              options: { overlay: getBoardFlipOverlay(this.skater.direction) },
            }),
            AnimationSequence.createAnim({
              anim: `idle-stand-${this.skater.direction}`,
              type: TransitionType.Time,
              transition: { duration: 1000 },
              options: {
                overlay: getBoardCarryOverlay(this.skater.direction, true),
              },
            }),
          ],
          (anim: string) => {
            console.log(anim);
          },
        );
        this.animSeq.start();
      }

      console.log(
        "UPDATING ANIM SEQ",
        this.animSeq.isFinished,
        this.animSeq.hasStarted(),
      );
      this.animSeq.update(dt);
    } else {
      const anim = this.skater.animations.getPlaying();

      if (anim === null || !anim.includes(`-${this.skater.direction}`)) {
        if (this.skater.direction === "e") {
          this.skater.animations.play(`cruise-b-${this.skater.direction}`);
        } else if (this.skater.direction === "w") {
          this.skater.animations.play(`cruise-f-${this.skater.direction}`);
        } else {
          this.skater.animations.play(`cruise-${this.skater.direction}`);
        }
      }

      this.path.update(dt);
    }
  }

  isComplete(): boolean {
    return (
      this.path.hasReachedGoal &&
      this.animSeq !== null &&
      this.animSeq.isFinished
    );
  }
}

class WaitingMyTurn implements SkateUpdatable {
  static TAG: "waiting-my-turn" = "waiting-my-turn";
  readonly tag: "waiting-my-turn" = WaitingMyTurn.TAG;
  private skater: Skater;
  private obstacle: Obstacle;
  private timer: Timer;

  constructor(skater: Skater, obstacle: Obstacle) {
    this.skater = skater;

    this.obstacle = obstacle;
    this.timer = new Timer();
    this.timer.start(1000 * 3);
    if (this.obstacle.isStartOnGround()) {
      const skaterCell = this.skater.getGridCell();
      (this.skater.scene as Play).grid[skaterCell.row][skaterCell.col] = 1;
    }
  }

  init() {}

  update(_: number): void {
    if (
      !this.skater.animations.isPlaying(`idle-stand-${this.skater.direction}`)
    ) {
      this.skater.animations.play(`idle-stand-${this.skater.direction}`, {
        overlay: getBoardCarryOverlay(this.skater.direction, true),
      });
    }

    if (this.obstacle.isMyTurn(this.skater.id)) {
      if (this.obstacle.isStartOnGround()) {
        const skaterCell = this.skater.getGridCell();
        (this.skater.scene as Play).grid[skaterCell.row][skaterCell.col] =
          0;
      }

      this.obstacle.skate(this.skater.id);
    }
  }

  isComplete(): boolean {
    return this.obstacle.isOccupiedByMe(this.skater.id) && this.timer.isStopped;
  }
}

class SittingBench implements SkateUpdatable {
  static TAG: "bench" = "bench";
  readonly tag: "bench" = SittingBench.TAG;
  private skater: Skater;
  private timer: Timer;
  private bench: Bench;

  constructor(skater: Skater, bench: Bench, duration: number) {
    this.skater = skater;

    this.bench = bench;
    this.timer = new Timer();
    this.timer.start(duration);

    const skaterCell = this.skater.getGridCell();
    (this.skater.scene as Play).grid[skaterCell.row][skaterCell.col] = 1;
  }

  init() {}

  update(_: number): void {
    if (!this.skater.animations.isPlaying("idle-sit-s")) {
      this.skater.pos.x = this.bench.pos.x;
      this.skater.pos.y = this.bench.pos.y;
      this.skater.direction = "s";
      this.skater.pos.y -= 2;
      this.skater.animations.play("idle-sit-s", {
        overlay: {
          name: `board-sit-s`,
          drawOnTop: true,
          drawBehind: false,
          dy: this.skater.tileSize * 0.5 + 2,
          dx: 0,
        },
      });
    }
  }

  isComplete(): boolean {
    return this.timer.isStopped;
  }
}


export interface SkateUpdatable extends Updatable {
  readonly tag: SkatingAtParkActionTag;
}


const spec = {
  "skating-at-park": { ctor: SkatingAtPark },
  "cruise-to":       { ctor: CruiseTo },
  bench:             { ctor: SittingBench },
  "climb-ramp":      { ctor: ClimbRamp },
  "ramp-tricks":     { ctor: RampTricks },
  "waiting-my-turn": { ctor: WaitingMyTurn },
  flat:              { ctor: FlatObstacle },
  ramp:              { ctor: RampObstacle },
} as const;

export type SkateActionSpec = {
  [K in keyof typeof spec]: {
    args: ConstructorParameters<typeof spec[K]["ctor"]>;
    result: InstanceType<typeof spec[K]["ctor"]>;
  };
};

export type SkatingAtParkActionTag = keyof SkateActionSpec;

export const ActionConstructors = Object.fromEntries(
  Object.entries(spec).map(([k, v]) => [k, v.ctor])
) as { [K in SkatingAtParkActionTag]: typeof spec[K]["ctor"] };
