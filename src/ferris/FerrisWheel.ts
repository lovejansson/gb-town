import { StaticImage, type Vec2 } from "../lib";
import type Play from "../Play";
import { Door } from "../House";

export default class FerrisWheel extends StaticImage {
  static readonly ANGLE_STEPS = 128;
  static readonly ANGLE_DELTA = (Math.PI * 2) / FerrisWheel.ANGLE_STEPS;
  static readonly LAPS = 1;

  private play: Play;
  private queue: number[];
  private carts: Cart[];

  private passengers: { humanID: number; cartID: number; laps: number }[];
  private bottomCart: Cart | null;
  private lastBottomCartID: number | null;

  isRunning: boolean;
  readonly radius: number;
  readonly center: Vec2;

  constructor(
    scene: Play,
    pos: Vec2,
    width: number,
    height: number,
    image: string,
  ) {
    super(scene, pos, width, height, image);
    this.radius = 49;
    this.center = { x: pos.x + 12 + this.radius, y: this.pos.y + this.radius };
    this.play = scene;
    this.queue = [];
    this.isRunning = true;
    this.carts = [];
    this.passengers = [];
    this.bottomCart = null;
    this.lastBottomCartID = null;
  }

  getArrivePos(): Vec2 {
    return {
      x: this.pos.x + this.scene.art!.tileSize * 3,
      y: this.pos.y + this.height,
    };
  }

  getCartBoardingPos(): Vec2 {
    const arrivePos = this.getArrivePos();
    return { x: arrivePos.x, y: arrivePos.y - this.scene.art!.tileSize };
  }

  isMyTurnToHopOff(id: number): boolean {
    const p = this.passengers.find((p) => p.humanID === id);

    if (p === undefined)
      throw new Error("Human is not a passenger on this ferris wheel!");

    return this.bottomCart !== null && this.bottomCart.id === p.cartID;
  }

  isMyTurnToHopOn(id: number): boolean {
    return this.queue[0] === id;
  }

  getPassengerCartPos(id: number): Vec2 {
    const cart = this.getPassengerCart(id);

    return { x: cart.pos.x, y: cart.pos.y };
  }

  getBoardingCart(): Cart {
    if (this.bottomCart === null) {
      throw new Error("No cart is available right now");
    }

    return this.bottomCart;
  }

  getPassengerCart(id: number): Cart {
    const passenger = this.passengers.find((p) => p.humanID === id);

    if (passenger === undefined) {
      throw new Error("Human is not a passenger on this ferris wheel!");
    }

    const cart = this.carts.find((c) => c.id === passenger.cartID);

    if (cart === undefined) {
      throw new Error("Passenger cart not found on ferris wheel.");
    }

    return cart;
  }

  getCartDoors(): Door[] {
    return this.carts.map((c) => c.getDoor());
  }

  createCarts(): Cart[] {
    const cartCount = 8;
    const angleStep = (2 * Math.PI) / cartCount;

    for (let i = 0; i < cartCount; ++i) {
      const angle = i * angleStep;
      const arcPos = getArcPos(angle, this.radius, this.center);
      const cart = new Cart(
        this.play,
        { x: arcPos.x - 16, y: arcPos.y - 8 },
        32,
        16,
        this,
        angle,
      );

      this.carts.push(cart);

      if (cart.isAtBottom()) {
        this.bottomCart = cart;
      }
    }

    return this.carts;
  }

  standInLine(id: number): void {
    if (this.queue.find((i) => i === id) !== undefined)
      throw new Error("Human is already standing in line!");
    this.queue.push(id);
  }

  startRide(): void {
    this.isRunning = true;
  }

  stopRide(): void {
    this.isRunning = false;
  }

  hasCompletedLaps(id: number): boolean {
    const passenger = this.passengers.find((p) => p.humanID === id);

    if (passenger === undefined)
      throw new Error("Human is not a passenger on this ferris wheel!");

    return passenger.laps >= FerrisWheel.LAPS;
  }

  hopOn(id: number): void {
    if (this.bottomCart === null)
      throw new Error("No cart is available right now");
    if (this.passengers.find((p) => p.humanID === id))
      throw new Error("Human is already a passenger!");
    if (this.queue[0] !== id) throw new Error("Human is not first in line!");

    this.passengers.push({ humanID: id, cartID: this.bottomCart.id, laps: 0 });
    this.queue.shift();
  }

  hopOff(id: number): void {
    const passengerIdx = this.passengers.findIndex((p) => p.humanID === id);

    if (passengerIdx === -1)
      throw new Error("Human is not a passenger of the ferris wheel");

    const passenger = this.passengers[passengerIdx];

    if (this.bottomCart === null || this.bottomCart.id !== passenger.cartID)
      throw new Error("Passenger can't hop off if cart is not at bottom");

    this.passengers.splice(passengerIdx, 1);
  }

  update(dt: number): void {
    if (this.isRunning) {
      for (const c of this.carts) {
        c.update(dt);
      }

      this.bottomCart = this.carts.find((c) => c.isAtBottom()) ?? null;
      const reachedNewBottomCart =
        this.bottomCart !== null &&
        this.bottomCart.id !== this.lastBottomCartID;

      // Stop when a new queue rider can board; RideFerry controls start/stop during the ride.

      if (this.bottomCart !== null && reachedNewBottomCart) {
        const p = this.passengers.find((p) => p.cartID === this.bottomCart!.id);

        if (p !== undefined) {
          p.laps++;
        } else if (this.queue.length > 0) {
          this.stopRide();
        }
      }

      this.lastBottomCartID = this.bottomCart?.id ?? null;
    }
  }
}

export class Cart extends StaticImage {
  private frameMS: number;
  static FRAME_RATE = 150;
  private currAngle: number;
  private wheel: FerrisWheel;
  private door: Door;

  constructor(
    scene: Play,
    pos: Vec2,
    width: number,
    height: number,
    wheel: FerrisWheel,
    startAngle: number,
  ) {
    super(scene, pos, width, height, "cart");

    this.frameMS = 0;
    this.currAngle = startAngle;
    this.wheel = wheel;
    this.door = new Door(
      scene,
      { x: pos.x, y: pos.y },
      width,
      height,
      "cart-door",
    );

  }

  update(dt: number): void {
    if (this.wheel.isRunning) {
      this.frameMS += dt;

      if (this.frameMS >= Cart.FRAME_RATE) {
        this.nextAngle();
        this.frameMS = 0;
        const arcPos = getArcPos(
          this.currAngle,
          this.wheel.radius,
          this.wheel.center,
        );
        this.pos = {
          x: Math.round(arcPos.x) - this.halfWidth,
          y: Math.round(arcPos.y) - this.halfHeight,
        };

        this.door.pos = { x: this.pos.x, y: this.pos.y };
      }
    }

  }

  getDoor(): Door {
    return this.door;
  }

  openDoor(): void {
    this.door.pos = { x: this.pos.x, y: this.pos.y };
    this.door.open();
  }

  closeDoor(): void {
    this.door.close();
  }

  isDoorOpen(): boolean {
    return this.door.isOpen();
  }

  isDoorClosed(): boolean {
    return this.door.isClosed();
  }

  isAtBottom() {
    const diff = Math.abs(this.currAngle - Math.PI / 2);
    return diff < FerrisWheel.ANGLE_DELTA;
  }

  private nextAngle(): void {
    this.currAngle += FerrisWheel.ANGLE_DELTA;

    if (this.currAngle >= Math.PI * 2) {
      this.currAngle -= Math.PI * 2;
    }
  }
}

function getArcPos(angle: number, radius: number, c: Vec2): Vec2 {
  const x = Math.cos(angle) * radius + c.x;
  const y = Math.sin(angle) * radius + c.y;

  return { x, y };
}
