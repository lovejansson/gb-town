import type Human from "./Human";
import SkatingAtPark, { type SubActionTag } from "./skate/SkatingAtPark";

/**
 * Utility AI for deciding the top-level actions a character can take in the world.
 */
export default class UtilityAI {
  private sprite: Human;
  private actions: ActionTag[];
  private currAction: Updatable;
  private chain: ActionNode[];

  constructor(sprite: Human, actions: ActionTag[], initAction: ActionTag) {
    this.sprite = sprite;
    this.actions = actions;
    const ctor = ActionConstructors[initAction];
    this.currAction = new ctor(this.sprite);
    this.chain = [{
      parentAction: initAction,
      currentAction: initAction,
      targetId: null,
      reason: `selected top-level initial action ${initAction}`,
    }];
  }

  update(dt: number): void {
    this.currAction.update(dt);

    if (this.currAction.isComplete()) {
      this.chain.pop();
      this.newAction();
    }
  }

  registerAction(action: ActionTag) {
    if (this.actions.includes(action))
      throw new Error("Action already registered.");
    this.popAction();
  }

  unregisterAction(action: ActionTag): void {
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
    let action: ActionTag = "skating-at-park";

    for (const a of this.actions) {
      const scoreFn = ActionScoreFunctions[a];

      const score = scoreFn(this.sprite, { time: 0 });

      if (score > max) {
        max = score;
        action = a;
      }
    }

    const ctor = ActionConstructors[action];
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
  parentAction: ActionTag | SubActionTag;
  currentAction: ActionTag | SubActionTag;
  targetId: number | null;
  reason: string | null;
};

export type ActionTag = "skating-at-park" | "beach";

const ActionConstructors: { [T in ActionTag]: UpdatableConstructor } = {
  "skating-at-park": SkatingAtPark,
  beach: SkatingAtPark,
};

interface UpdatableConstructor {
  new (human: Human): Updatable;
}

export interface Updatable {
  readonly tag: ActionTag;
  update(dt: number): void;
  isComplete(): boolean;
}

type WorldState = {
  time: number;
};

type ActionScoreFn = (human: Human, worldState: WorldState) => number;

const ActionScoreFunctions: {
  [T in ActionTag]: ActionScoreFn;
} = {
  "skating-at-park": calcSkateAtParkAction,
  beach: calcGoToBeachAction,
};

function calcSkateAtParkAction(human: Human, worldState: WorldState): number {
  return 1.0;
}

function calcGoToBeachAction(human: Human, worldState: WorldState): number {
  return 0.0;
}
