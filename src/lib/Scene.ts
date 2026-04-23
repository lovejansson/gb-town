import Art from "./Art.ts";

export default abstract class Scene {
  
    art: Art | null;

    constructor() {
        if (new.target === Scene) {
            throw new TypeError("Cannot construct Scene instances directly");
        }
        this.art = null; // Will be set by the Art class on initialization
    }

    abstract init(): Promise<void>;

    abstract draw(ctx: CanvasRenderingContext2D): void;


    update(dt: number): void {
        // Can be overridden by subclasses
    }

    start(): void {
        // Can be overridden by subclasses
    }

    stop(): void {
        // Can be overridden by subclasses
    }
}