import type { Shape } from "../domain/Shape.js";
import { AbstractCommand } from "./AbstractCommand.js";

export class MoveCommand extends AbstractCommand {
  public constructor(
    private readonly shape: Shape,
    private readonly deltaX: number,
    private readonly deltaY: number,
  ) {
    super();
  }

  protected executeInternal(): void {
    this.shape.move(this.deltaX, this.deltaY);
  }

  protected undoInternal(): void {
    this.shape.move(-this.deltaX, -this.deltaY);
  }
}