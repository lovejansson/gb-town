import { StaticImage, type Direction, type Vec2 } from "../lib";
import House, { Door } from "../House";
import type Play from "../Play";
import OrdersManager from "./orders";

export default class Restaurant extends House {
  private play: Play;
  private orders: OrdersManager;

  constructor(
    scene: Play,
    pos: Vec2,
    width: number,
    height: number,
    image: string,
    door: Door,
  ) {
    super(scene, pos, width, height, image, door);
    this.play = scene;
    this.orders = new OrdersManager();
  }

  placeOrder(table: Table) {
    this.orders.add({ pos: table.pos, tableId: table.id });
  }

  getOrder() {
    return this.orders.next();
  }

  serveOrder(tableId: number) {
    this.orders.serve(tableId);
  }

  getServedOrder(tableId: number) {
    return this.orders.nextServed(tableId);
  }

  hasAvailableTables() {
    return this.play.tables.hasAvailableTables(this.image);
  }

  arrive() {
    if (!this.hasAvailableTables())
      throw new Error("Restaurant has no available tables.");
    const table = this.play.tables.reserveTable(this.image);
    return table;
  }

  leave(tableID: number) {
    this.play.tables.leaveTable(tableID);
  }
}

export class Tables {
  private tables: { table: Table; isFree: boolean }[];

  constructor(tables: Table[]) {
    this.tables = tables.map((t) => ({ table: t, isFree: true }));
  }

  hasAvailableTables(restaurant: string): boolean {
    return (
      this.tables.find(
        (t) =>
          t.table.restaurants.find((r) => r === restaurant) !== undefined &&
          t.isFree,
      ) !== undefined
    );
  }

  reserveTable(restaurant: string): Table {
    const table = this.tables.find(
      (t) =>
        t.table.restaurants.find((r) => r === restaurant) !== undefined &&
        t.isFree,
    );

    if (table === undefined)
      throw new Error("Restaurant has no available tables.");

    table.isFree = false;

    return table.table;
  }

  leaveTable(tableID: number): void {
    const table = this.tables.find((t) => t.table.id === tableID);

    if (table === undefined) throw new Error("Table not found");

    table.isFree = true;
  }

  getTable(tableID: number): Table {
    const table = this.tables.find((t) => t.table.id === tableID);
    if (table === undefined) throw new Error("Table not found");
    return table.table;
  }
}

export class Table extends StaticImage {
  private seats: {pos: Vec2, direction: Direction}[];
  restaurants: string[];

  constructor(
    scene: Play,
    pos: Vec2,
    width: number,
    height: number,
    image: string,
    seats: {pos: Vec2, direction: Direction}[],
    restaurants: string[],
  ) {
    super(scene, pos, width, height, image);
    this.seats = seats;
    this.restaurants = restaurants;
  }

  getSeat(): {pos: Vec2, direction: Direction} {
    return this.seats[0]; // randomEl(this.seats)!;
  }

  getArrivePos(currentPos: Vec2, seat: { pos: Vec2; direction: Direction }, tileSize: number): Vec2 {
    if (this.image !== "round-table") {
      throw new Error("Table.getArrivePos is currently only implemented for round-table");
    }

    switch (seat.direction) {
      case "n":
      case "s": {
        const useWestSide = currentPos.x < seat.pos.x;
        return {
          x: useWestSide ? seat.pos.x - tileSize * 2 : seat.pos.x + tileSize * 2,
          y: seat.pos.y,
        };
      }
      case "w":
      case "e": {
        const useNorthSide = currentPos.y < seat.pos.y;
        return {
          x: seat.pos.x,
          y: useNorthSide ? seat.pos.y - tileSize * 2 : seat.pos.y + tileSize * 2,
        };
      }
      default:
        throw new Error(`Unsupported seat direction: ${seat.direction}`);
    }
  }

  getClosestCornerPos(currentPos: Vec2, tileSize: number): Vec2 {
    if (this.image !== "round-table") {
      throw new Error("Table.getClosestCornerPos is currently only implemented for round-table");
    }

    const corners = [
      { x: this.pos.x - tileSize, y: this.pos.y - tileSize },
      { x: this.pos.x + tileSize * 2, y: this.pos.y - tileSize },
      { x: this.pos.x + tileSize * 2, y: this.pos.y + tileSize },
      { x: this.pos.x - tileSize, y: this.pos.y + tileSize },
    ];

    let closest = corners[0];
    let minDistSq = Number.POSITIVE_INFINITY;

    for (const corner of corners) {
      const dx = corner.x - currentPos.x;
      const dy = corner.y - currentPos.y;
      const distSq = dx * dx + dy * dy;
      if (distSq < minDistSq) {
        minDistSq = distSq;
        closest = corner;
      }
    }

    return closest;
  }
}
