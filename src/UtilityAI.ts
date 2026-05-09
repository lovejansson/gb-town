import type Human from "./Human";
import type { ActionTag, Updatable } from "./actions";
import RideFerrisWheel from "./ferris/RideFerrisWheel";
import EatAtRestaurant, { WorkAtRestaurant } from "./restaurant/EatAtRestaurant";
import SkatingAtPark from "./skate/SkatingAtPark";

/**
 * Utility AI for deciding the top-level actions a character can take in the world.
 */
export default class UtilityAI {
  private sprite: Human;
  private actions: MainActionTag[];
  private currAction: MainActionUpdatable | null;
  private chain: ActionNode[];

  constructor(sprite: Human, actions: MainActionTag[]) {
    this.sprite = sprite;
    this.actions = actions;
    this.chain = [];
    this.currAction = null;
  }

  init(initAction: MainActionTag): void {
    if (!this.actions.includes(initAction))
      throw new Error(
        "Initial action is not registered as an action for human!",
      );

    const ctor = MainActionConstructors[initAction];
    this.currAction = new ctor(this.sprite);
    this.chain = [
      {
        parentAction: initAction,
        currentAction: initAction,
        targetId: null,
        reason: `selected top-level initial action ${initAction}`,
      },
    ];

    this.currAction.init();
  }

  update(dt: number): void {
    if (this.currAction === null) throw new Error("UtilityAI uninitialized");
    this.currAction.update(dt);

    if (this.currAction.isComplete()) {
      this.chain.pop();
      this.newAction();
    }
  }

  registerAction(action: MainActionTag) {
    if (this.actions.includes(action))
      throw new Error("Action already registered.");
    this.popAction();
  }

  unregisterAction(action: MainActionTag): void {
    const idx = this.actions.findIndex((a) => a === action);

    if (idx === -1) throw new Error("Action not registered.");

    this.actions.splice(idx, 1);
  }

  getCurrentAction(): ActionNode {
    return this.chain[this.chain.length - 1];
  }

  popAction() {
    this.chain.pop();
  }

  pushAction(actionNode: ActionNode) {
    this.chain.push(actionNode);
    console.log(this.chain);
  }

  private newAction() {
    let max = 0;
    let action: MainActionTag = "skating-at-park";

    for (const a of this.actions) {
      const scoreFn = ActionScoreFunctions[a];

      const score = scoreFn(this.sprite);

      if (score > max) {
        max = score;
        action = a;
      }
    }

    const ctor = MainActionConstructors[action];

    this.currAction = new ctor(this.sprite);
    this.pushAction({
      parentAction: action,
      currentAction: action,
      targetId: null,
      reason: `selected top-level action ${action} with score ${max.toFixed(2)}`,
    });
  }
}

type ActionNode = {
  parentAction: ActionTag;
  currentAction: ActionTag;
  targetId: number | null;
  reason: string | null;
};

interface MainActionUpdatable extends Updatable {
  readonly tag: MainActionTag;
}
export type MainActionTag =
  | "skating-at-park"
  | "eat-restaurant"
  | "work-restaurant"
  | "ride-ferris-wheel";

const mainSpec = {
  "skating-at-park": { ctor: SkatingAtPark },
  "eat-restaurant": { ctor: EatAtRestaurant },
  "work-restaurant": { ctor: WorkAtRestaurant },
  "ride-ferris-wheel": { ctor: RideFerrisWheel },
} as const;

export type MainActionSpec = {
  [K in keyof typeof mainSpec]: {
    args: ConstructorParameters<(typeof mainSpec)[K]["ctor"]>;
    result: InstanceType<(typeof mainSpec)[K]["ctor"]>;
  };
};

export const MainActionConstructors = Object.fromEntries(
  Object.entries(mainSpec).map(([k, v]) => [k, v.ctor]),
) as { [K in MainActionTag]: (typeof mainSpec)[K]["ctor"] };

type ActionScoreFn = (human: Human) => number;

const ActionScoreFunctions: {
  [T in MainActionTag]: ActionScoreFn;
} = {
  "skating-at-park": calcSkateAtParkAction,
  "eat-restaurant": calcGoToRestaurant,
  "work-restaurant": workRestaurant,
  "ride-ferris-wheel": calcRideFerrisWheel,
};

function calcSkateAtParkAction(_: Human): number {
  return 0.0;
}

function workRestaurant(_: Human): number {
  return 1.0;
}

function calcGoToRestaurant(_: Human): number {
  return 1.0;
}

function calcRideFerrisWheel(_: Human): number {
  return 1.0;
}
