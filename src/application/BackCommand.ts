import type { Shape } from "../domain/Shape.js";
import type { SvgDocument } from "../domain/SvgDocument.js";
import { AbstractCommand } from "./AbstractCommand.js";
import { ShapePlacement } from "./ShapePlacement.js";

export class BackCommand extends AbstractCommand {
  private placement: ShapePlacement | undefined;

  public constructor(private readonly document: SvgDocument, private readonly shape: Shape) {
    super();
  }

  protected executeInternal(): void {
    if (this.placement === undefined) this.placement = ShapePlacement.capture(this.document, this.shape);
    this.document.moveShapeAt(this.shape, this.shape.parent, 0);
  }

  protected undoInternal(): void {
    this.document.moveShapeAt(this.shape, this.placement!.parent, this.placement!.index);
  }
}