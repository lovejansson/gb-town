import { Sprite, StaticImage, type Vec2 } from "./lib";
import type Play from "./Play";

enum DoorState {
  OPENING,
  CLOSING,
  OPEN,
  CLOSED,
}

export class Door extends Sprite {
  private state: DoorState;
  private doorNum: number | null;
  private spritesheet: string;
  private isNumberedDoor: boolean;

  constructor(
    scene: Play,
    pos: Vec2,
    width: number,
    height: number,
    spritesheet: string,
    doorNum?: number,
  ) {
    super(scene, pos, width, height);
    this.state = DoorState.CLOSED;
    this.spritesheet = spritesheet;
    this.isNumberedDoor =
      spritesheet === "door-big" || spritesheet === "door-small";

    if (this.isNumberedDoor) {
      if (doorNum === undefined)
        throw new Error("doorNum is required for door-big and door-small");
      this.doorNum = doorNum;
    } else {
      this.doorNum = null;
    }

    this.animations.registerSpritesheet(spritesheet);
  }

  private getBaseAnimKey(): string {
    if (this.isNumberedDoor) {
      if (this.doorNum === null) throw new Error("Invalid numbered door state");
      return `${this.doorNum}`;
    }

    return this.spritesheet;
  }

  isOpen() {
    return this.state === DoorState.OPEN;
  }

  isClosed() {
    return this.state === DoorState.CLOSED;
  }

  close() {
    this.state = DoorState.CLOSING;
    this.animations.play(this.getBaseAnimKey(), { reverse: true });
  }

  open() {
    this.state = DoorState.OPENING;
    this.animations.play(this.getBaseAnimKey());
  }

  update(_: number): void {
    const baseKey = this.getBaseAnimKey();

    switch (this.state) {
      case DoorState.OPENING:
        if (!this.animations.isPlaying(baseKey)) {
          this.state = DoorState.OPEN;

          if (this.isNumberedDoor) {
            this.animations.play(`${baseKey}-open`);
          }
        }
        break;
      case DoorState.CLOSING:
        if (!this.animations.isPlaying(baseKey)) {
          if (this.isNumberedDoor) {
            this.animations.play(`${baseKey}-closed`);
          }
          this.state = DoorState.CLOSED;
        }
        break;
      case DoorState.OPEN:
        if (
          this.isNumberedDoor &&
          !this.animations.isPlaying(`${baseKey}-open`)
        ) {
          this.animations.play(`${baseKey}-open`);
        }
        break;
      case DoorState.CLOSED:
        if (
          this.isNumberedDoor &&
          !this.animations.isPlaying(`${baseKey}-closed`)
        ) {
          this.animations.play(`${baseKey}-closed`);
        }
        break;
    }
  }
}

export default class House extends StaticImage {
  private door: Door;

  constructor(
    scene: Play,
    pos: Vec2,
    width: number,
    height: number,
    image: string,
    door: Door,
  ) {
    super(scene, pos, width, height, image);
    this.door = door;
  }

  getArrivePos(): Vec2 {
    return {
      x: this.door.pos.x + this.door.halfWidth / 2,
      y: this.pos.y + this.height,
    };
  }

  closeDoor() {
    this.door.close();
  }

  openDoor() {
    this.door.open();
  }

  isDoorClosed() {
    return this.door.isClosed();
  }

  isDoorOpen() {
    return this.door.isOpen();
  }
}
