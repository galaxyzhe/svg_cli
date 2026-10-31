import { DomainError } from "../domain/DomainError.js";
import type { Shape } from "../domain/Shape.js";
import { AbstractCommand } from "./AbstractCommand.js";

export class ScaleCommand extends AbstractCommand {
  public constructor(private readonly shape: Shape, private readonly factor: number) {
    super();
    if (!Number.isFinite(factor) || factor <= 0 || !Number.isFinite(1 / factor)) {
      throw new DomainError("scale factor must be positive");
    }
  }

  protected executeInternal(): void {
    this.shape.scale(this.factor);
  }

  protected undoInternal(): void {
    this.shape.scale(1 / this.factor);
  }
}