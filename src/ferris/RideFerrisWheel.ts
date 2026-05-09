import type Human from "../Human";
import { AnimationSequence, TransitionType } from "../lib";
import type Play from "../Play";
import Timer, { TEN_SECONDS } from "../Timer";
import { GoTo, type CommonUpdatable } from "../commonActions";
import House from "../House";
import { createAction, type Updatable } from "../actions";
import type FerrisWheel from "./FerrisWheel";
import type { Cart } from "./FerrisWheel";

const RIDE_START_STAND_MS = 1000;
const RIDE_END_SIT_MS = 1000;
const RIDE_END_STAND_MS = 1000;
const CART_ENTRY_EXIT_EXTRA_Y = 8;

enum BuyTicketStep {
  OPEN_WINDOW,
  WAIT,
  CLOSE_WINDOW,
  DONE,
}

class BuyFerryTicket implements FerrisUpdatable {
  static TAG: "buy-ferry-ticket" = "buy-ferry-ticket";
  readonly tag: "buy-ferry-ticket" = BuyFerryTicket.TAG;

  private human: Human;
  private house: House;
  private timer: Timer | null;
  private step: BuyTicketStep;

  constructor(human: Human, house: House) {
    this.human = human;
    this.house = house;
    this.timer = null;
    this.step = BuyTicketStep.OPEN_WINDOW;
  }

  init() {
    this.human.direction = "n";
    this.human.animations.play("idle-stand-n");
  }

  update(_: number): void {
    switch (this.step) {
      case BuyTicketStep.OPEN_WINDOW:
        if (this.house.isDoorClosed()) {
          this.house.openDoor();
        } else if (this.house.isDoorOpen()) {
          this.step = BuyTicketStep.WAIT;
        }
        break;
      case BuyTicketStep.WAIT:
        if (this.timer === null) {
          this.timer = new Timer();
          this.timer.start(TEN_SECONDS);
        } else if (this.timer.isStopped) {
          this.step = BuyTicketStep.CLOSE_WINDOW;
        }
        break;
      case BuyTicketStep.CLOSE_WINDOW:
        if (this.house.isDoorOpen()) {
          this.house.closeDoor();
        } else if (this.house.isDoorClosed()) {
          this.step = BuyTicketStep.DONE;
        }
        break;
      case BuyTicketStep.DONE:
        break;
    }
  }

  isComplete(): boolean {
    return this.step === BuyTicketStep.DONE;
  }
}

class QueueToFerry implements FerrisUpdatable {
  static TAG: "queue-to-ferry" = "queue-to-ferry";
  readonly tag: "queue-to-ferry" = QueueToFerry.TAG;

  private human: Human;
  private ferrisWheel: FerrisWheel;
  private hasQueued: boolean;

  constructor(human: Human, ferrisWheel: FerrisWheel) {
    this.human = human;
    this.ferrisWheel = ferrisWheel;
    this.hasQueued = false;
  }

  init() {
    this.human.direction = "n";
    this.human.animations.play("idle-stand-n");
  }

  update(_: number): void {
    if (!this.hasQueued) {
      this.ferrisWheel.standInLine(this.human.id);
      this.hasQueued = true;
    }

    if (!this.human.animations.isPlaying("idle-stand-n")) {
      this.human.animations.play("idle-stand-n");
    }
  }

  isComplete(): boolean {
    return (
      this.ferrisWheel.isMyTurnToHopOn(this.human.id) &&
      !this.ferrisWheel.isRunning
    );
  }
}

enum HopStep {
  WAIT,
  OPEN_DOOR,
  MOVE,
  CLOSE_DOOR,
  SIT,
  DONE,
}

class HopOnFerry implements FerrisUpdatable {
  static TAG: "hop-on-ferry" = "hop-on-ferry";
  readonly tag: "hop-on-ferry" = HopOnFerry.TAG;

  private human: Human;
  private ferrisWheel: FerrisWheel;
  private cart: Cart | null;
  private sitDirection: "e" | "w";
  private step: HopStep;
  private seq: AnimationSequence | null;

  constructor(human: Human, ferrisWheel: FerrisWheel) {
    this.human = human;
    this.ferrisWheel = ferrisWheel;
    this.cart = null;
    this.sitDirection = this.human.id % 2 === 0 ? "e" : "w";
    this.step = HopStep.OPEN_DOOR;
    this.seq = null;
  }

  private getCartSeatPos(): { x: number; y: number } {
    if (this.cart === null) {
      throw new Error("Boarding cart not found for seat position");
    }

    const xOffset = this.sitDirection === "w" ? this.human.tileSize / 2 : 2;

    return {
      x: this.cart.pos.x + xOffset,
      y: this.cart.pos.y - this.human.tileSize / 2,
    };
  }

  init() {
    this.human.direction = "n";
    this.human.animations.play("idle-stand-n");
  }

  update(dt: number): void {
    switch (this.step) {
      case HopStep.OPEN_DOOR:
        if (this.cart === null) {
          this.cart = this.ferrisWheel.getBoardingCart();
        }

        if (this.cart.isDoorClosed()) {
          this.cart.openDoor();
        } else if (this.cart.isDoorOpen()) {
          this.step = HopStep.MOVE;
        }
        break;
      case HopStep.MOVE:
      {
        if (this.seq === null) {
          this.human.direction = "n";
          this.seq = new AnimationSequence(this.human, [
            AnimationSequence.createAnim({
              anim: "walk-n",
              type: TransitionType.Distance,
              transition: {
                dx: 0,
                dy: -(this.human.tileSize + CART_ENTRY_EXIT_EXTRA_Y),
              },
            }),
          ]);
          this.seq.start();
        } else if (this.seq.isFinished) {
          const boardingPos = this.ferrisWheel.getCartBoardingPos();
          this.human.pos = {
            x: boardingPos.x,
            y: boardingPos.y - CART_ENTRY_EXIT_EXTRA_Y,
          };
          this.human.direction = "n";
          this.human.animations.play("idle-stand-n");
          this.seq = null;
          this.step = HopStep.CLOSE_DOOR;
        } else {
          this.seq.update(dt);
        }
        break;
      }
      case HopStep.CLOSE_DOOR:
      {
        if (this.cart === null) {
          throw new Error("Boarding cart not found while closing door");
        }

        const boardingPos = this.ferrisWheel.getCartBoardingPos();
        this.human.pos = {
          x: boardingPos.x,
          y: boardingPos.y - CART_ENTRY_EXIT_EXTRA_Y,
        };
        this.human.direction = "n";
        if (!this.human.animations.isPlaying("idle-stand-n")) {
          this.human.animations.play("idle-stand-n");
        }

        if (this.cart.isDoorOpen()) {
          this.cart.closeDoor();
        } else if (this.cart.isDoorClosed()) {
          this.step = HopStep.SIT;
        }
        break;
      }
      case HopStep.SIT:
      {
        if (this.cart === null) {
          throw new Error("Boarding cart not found while sitting");
        }

        const seatPos = this.getCartSeatPos();
        const boardingPos = this.ferrisWheel.getCartBoardingPos();
        this.human.pos = { x: boardingPos.x, y: seatPos.y };
        this.human.direction = this.sitDirection;
        if (!this.human.animations.isPlaying(`idle-sit-${this.sitDirection}`)) {
          this.human.animations.play(`idle-sit-${this.sitDirection}`);
        }

        this.ferrisWheel.hopOn(this.human.id);
        this.human.setVisible(false);
        this.cart = null;
        this.step = HopStep.DONE;
        break;
      }
      case HopStep.DONE:
        break;
    }
  }

  isComplete(): boolean {
    return this.step === HopStep.DONE;
  }
}

class RideFerry implements FerrisUpdatable {
  static TAG: "ride-ferry" = "ride-ferry";
  readonly tag: "ride-ferry" = RideFerry.TAG;

  private human: Human;
  private ferrisWheel: FerrisWheel;
  private sitDirection: "e" | "w";
  private timer: Timer | null;
  private step: RideStep;

  constructor(human: Human, ferrisWheel: FerrisWheel) {
    this.human = human;
    this.ferrisWheel = ferrisWheel;
    this.sitDirection = this.human.id % 2 === 0 ? "e" : "w";
    this.timer = null;
    this.step = RideStep.START_STAND;
  }

  private getSeatPos(cartPos: { x: number; y: number }): { x: number; y: number } {
    const xOffset = this.sitDirection === "w" ? this.human.tileSize / 2 : 2;
    return {
      x: cartPos.x + xOffset,
      y: cartPos.y - this.human.tileSize / 2,
    };
  }

  private getStandPos(cartPos: { x: number; y: number }): { x: number; y: number } {
    const boardingPos = this.ferrisWheel.getCartBoardingPos();
    const seatPos = this.getSeatPos(cartPos);
    return {
      x: boardingPos.x,
      y: seatPos.y,
    };
  }

  init() {
    this.human.setVisible(true);
    this.step = RideStep.START_STAND;
    this.timer = null;
  }

  update(_: number): void {
    const cartPos = this.ferrisWheel.getPassengerCartPos(this.human.id);

    switch (this.step) {
      case RideStep.START_STAND: {
        const standPos = this.getStandPos(cartPos);
        this.human.pos = { x: standPos.x, y: standPos.y };
        this.human.direction = "s";
        if (!this.human.animations.isPlaying("idle-stand-s")) {
          this.human.animations.play("idle-stand-s");
        }

        if (this.timer === null) {
          this.timer = new Timer();
          this.timer.start(RIDE_START_STAND_MS);
        } else if (this.timer.isStopped) {
          this.timer = null;
          this.ferrisWheel.startRide();
          this.step = RideStep.RIDING;
        }
        break;
      }
      case RideStep.RIDING: {
        const seatPos = this.getSeatPos(cartPos);
        this.human.pos = { x: seatPos.x, y: seatPos.y };
        this.human.direction = this.sitDirection;
        if (!this.human.animations.isPlaying(`idle-sit-${this.sitDirection}`)) {
          this.human.animations.play(`idle-sit-${this.sitDirection}`);
        }

        if (
          this.ferrisWheel.hasCompletedLaps(this.human.id) &&
          this.ferrisWheel.isMyTurnToHopOff(this.human.id)
        ) {
          this.ferrisWheel.stopRide();
          this.step = RideStep.END_SIT;
          this.timer = null;
        }
        break;
      }
      case RideStep.END_SIT: {
        const seatPos = this.getSeatPos(cartPos);
        this.human.pos = { x: seatPos.x, y: seatPos.y };
        this.human.direction = this.sitDirection;
        if (!this.human.animations.isPlaying(`idle-sit-${this.sitDirection}`)) {
          this.human.animations.play(`idle-sit-${this.sitDirection}`);
        }

        if (this.timer === null) {
          this.timer = new Timer();
          this.timer.start(RIDE_END_SIT_MS);
        } else if (this.timer.isStopped) {
          this.timer = null;
          this.step = RideStep.END_STAND;
        }
        break;
      }
      case RideStep.END_STAND: {
        const standPos = this.getStandPos(cartPos);
        this.human.pos = { x: standPos.x, y: standPos.y };
        this.human.direction = "s";
        if (!this.human.animations.isPlaying("idle-stand-s")) {
          this.human.animations.play("idle-stand-s");
        }

        if (this.timer === null) {
          this.timer = new Timer();
          this.timer.start(RIDE_END_STAND_MS);
        } else if (this.timer.isStopped) {
          this.step = RideStep.DONE;
        }
        break;
      }
      case RideStep.DONE:
        break;
    }
  }

  isComplete(): boolean {
    return this.step === RideStep.DONE;
  }
}

enum RideStep {
  START_STAND,
  RIDING,
  END_SIT,
  END_STAND,
  DONE,
}

class HopOffFerry implements FerrisUpdatable {
  static TAG: "hop-off-ferry" = "hop-off-ferry";
  readonly tag: "hop-off-ferry" = HopOffFerry.TAG;

  private human: Human;
  private ferrisWheel: FerrisWheel;
  private cart: Cart | null;
  private sitDirection: "e" | "w";
  private step: HopStep;
  private seq: AnimationSequence | null;

  constructor(human: Human, ferrisWheel: FerrisWheel) {
    this.human = human;
    this.ferrisWheel = ferrisWheel;
    this.cart = null;
    this.sitDirection = this.human.id % 2 === 0 ? "e" : "w";
    this.step = HopStep.OPEN_DOOR;
    this.seq = null;
  }

  init() {
    this.human.direction = this.sitDirection;
    this.human.animations.play(`idle-sit-${this.sitDirection}`);
  }

  private getCartSeatPos(): { x: number; y: number } {
    if (this.cart === null) {
      throw new Error("Passenger cart not found for seat position");
    }

    const xOffset = this.sitDirection === "w" ? this.human.tileSize / 2 : 2;

    return {
      x: this.cart.pos.x + xOffset,
      y: this.cart.pos.y - this.human.tileSize / 2,
    };
  }

  update(dt: number): void {
    switch (this.step) {
      case HopStep.OPEN_DOOR:
        if (this.cart === null) {
          this.cart = this.ferrisWheel.getPassengerCart(this.human.id);
        }

        const standPos = this.getCartSeatPos();
        const boardingPos = this.ferrisWheel.getCartBoardingPos();
        this.human.setVisible(true);
        this.human.pos = { x: boardingPos.x, y: standPos.y };
        this.human.direction = "s";
        if (!this.human.animations.isPlaying("idle-stand-s")) {
          this.human.animations.play("idle-stand-s");
        }

        if (this.cart.isDoorClosed()) {
          this.cart.openDoor();
        } else if (this.cart.isDoorOpen()) {
          this.step = HopStep.MOVE;
        }
        break;
      case HopStep.MOVE:
        if (this.seq === null) {
          this.human.direction = "s";
          this.seq = new AnimationSequence(this.human, [
            AnimationSequence.createAnim({
              anim: "walk-s",
              type: TransitionType.Distance,
              transition: {
                dx: 0,
                dy: this.human.tileSize + CART_ENTRY_EXIT_EXTRA_Y,
              },
            }),
          ]);
          this.seq.start();
        } else if (this.seq.isFinished) {
          const p = this.ferrisWheel.getArrivePos();
          this.human.pos = { x: p.x, y: p.y };
          this.seq = null;
          this.step = HopStep.CLOSE_DOOR;
        } else {
          this.seq.update(dt);
        }
        break;
      case HopStep.CLOSE_DOOR:
        if (this.cart === null) {
          throw new Error("Passenger cart not found while closing door");
        }

        if (this.cart.isDoorOpen()) {
          this.cart.closeDoor();
        } else if (this.cart.isDoorClosed()) {
          this.ferrisWheel.hopOff(this.human.id);
          this.cart = null;
          this.step = HopStep.DONE;
        }
        break;
      case HopStep.DONE:
        break;
    }
  }

  isComplete(): boolean {
    return this.step === HopStep.DONE;
  }
}

class DoneFerry implements FerrisUpdatable {
  static TAG: "done-ferry" = "done-ferry";
  readonly tag: "done-ferry" = DoneFerry.TAG;

  private human: Human;

  constructor(human: Human) {
    this.human = human;
  }

  init() {
    this.human.direction = "s";
    this.human.animations.play("idle-stand-s");
  }

  update(_: number): void {
    if (!this.human.animations.isPlaying("idle-stand-s")) {
      this.human.animations.play("idle-stand-s");
    }
  }

  isComplete(): boolean {
    return false;
  }
}

export default class RideFerrisWheel implements FerrisUpdatable {
  static TAG: "ride-ferris-wheel" = "ride-ferris-wheel";
  readonly tag: "ride-ferris-wheel" = RideFerrisWheel.TAG;

  private human: Human;
  private house: House;
  private ferrisWheel: FerrisWheel;
  private currAction: FerrisUpdatable | CommonUpdatable | null;
  private hasBoughtTicket: boolean;

  constructor(human: Human) {
    this.human = human;
    const play = this.human.scene as Play;

    const ferryHouse = play.houses.find((h) => h.image === "ferry");

    if (ferryHouse === undefined) throw new Error("Ferry house not found");

    this.house = ferryHouse;
    this.ferrisWheel = play.getFerrisWheel();

    this.currAction = null;
    this.hasBoughtTicket = false;
  }

  init(): void {

    this.transitionToAction(
      createAction(GoTo.TAG, this.human, this.house.getArrivePos()),
      "Walking to ferry house",
      this.house.id,
    );
  }

  update(dt: number): void {
    if (this.currAction === null) throw new Error(this.tag + " uninitialized");

    this.currAction.update(dt);

    if (!this.currAction.isComplete()) return;

    switch (this.currAction.tag) {
      case GoTo.TAG:
        if (!this.hasBoughtTicket) {
          this.transitionToAction(
            createAction(BuyFerryTicket.TAG, this.human, this.house),
            "Buying ticket at ferry house window",
            this.house.id,
          );
        } else {
          this.transitionToAction(
            createAction(QueueToFerry.TAG, this.human, this.ferrisWheel),
            "Standing in line for ferris wheel",
            this.ferrisWheel.id,
          );
        }
        break;
      case BuyFerryTicket.TAG:
        this.hasBoughtTicket = true;
        this.transitionToAction(
          createAction(GoTo.TAG, this.human, this.ferrisWheel.getArrivePos()),
          "Walking to ferris wheel queue",
          this.ferrisWheel.id,
        );
        break;
      case QueueToFerry.TAG:
        this.transitionToAction(
          createAction(HopOnFerry.TAG, this.human, this.ferrisWheel),
          "Boarding ferris wheel cart",
          this.ferrisWheel.id,
        );
        break;
      case HopOnFerry.TAG:
        this.transitionToAction(
          createAction(RideFerry.TAG, this.human, this.ferrisWheel),
          "Riding ferris wheel",
          this.ferrisWheel.id,
        );
        break;
      case RideFerry.TAG:
        this.transitionToAction(
          createAction(HopOffFerry.TAG, this.human, this.ferrisWheel),
          "Leaving ferris wheel cart",
          this.ferrisWheel.id,
        );
        break;
      case HopOffFerry.TAG:
        this.transitionToAction(
          createAction(DoneFerry.TAG, this.human),
          "Ferris wheel action complete, standing idle",
          this.human.id,
        );
        break;
      case DoneFerry.TAG:
        break;
    }
  }

  isComplete(): boolean {
    if (this.currAction === null) return false;
    return (
      this.currAction.tag === DoneFerry.TAG && this.currAction.isComplete()
    );
  }

  private transitionToAction(
    nextAction: FerrisUpdatable | CommonUpdatable,
    reason?: string,
    targetID?: number,
  ) {
    if (this.currAction !== null) {
      this.human.utility.popAction();
    }

    this.currAction = nextAction;

    this.human.utility.pushAction({
      currentAction: this.currAction.tag,
      parentAction: this.tag,
      reason: reason ?? null,
      targetId: targetID ?? null,
    });

    this.currAction.init();
  }
}

interface FerrisUpdatable extends Updatable {
  readonly tag: FerrisActionTag;
}

const spec = {
  "ride-ferris-wheel": { ctor: RideFerrisWheel },
  "buy-ferry-ticket": { ctor: BuyFerryTicket },
  "queue-to-ferry": { ctor: QueueToFerry },
  "hop-on-ferry": { ctor: HopOnFerry },
  "ride-ferry": { ctor: RideFerry },
  "hop-off-ferry": { ctor: HopOffFerry },
  "done-ferry": { ctor: DoneFerry },
} as const;

export type FerrisActionSpec = {
  [K in keyof typeof spec]: {
    args: ConstructorParameters<(typeof spec)[K]["ctor"]>;
    result: InstanceType<(typeof spec)[K]["ctor"]>;
  };
};

export type FerrisActionTag = keyof FerrisActionSpec;

export const ActionConstructors = Object.fromEntries(
  Object.entries(spec).map(([k, v]) => [k, v.ctor]),
) as { [K in FerrisActionTag]: (typeof spec)[K]["ctor"] };
