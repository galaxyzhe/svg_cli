import type { Shape, ShapeAttributeValue } from "../domain/Shape.js";
import { AbstractCommand } from "./AbstractCommand.js";

export class SetCommand extends AbstractCommand {
  private oldValue: ShapeAttributeValue | undefined;
  private captured = false;

  public constructor(
    private readonly shape: Shape,
    private readonly attribute: string,
    private readonly value: string,
  ) {
    super();
  }

  protected executeInternal(): void {
    if (!this.captured) {
      this.oldValue = this.shape.getAttribute(this.attribute);
      this.captured = true;
    }
    this.shape.setAttribute(this.attribute, this.value);
  }

  protected undoInternal(): void {
    if (this.oldValue === undefined) this.shape.removeAttribute(this.attribute);
    else this.shape.setAttribute(this.attribute, String(this.oldValue));
  }
}