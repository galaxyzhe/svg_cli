import type { Shape } from "../domain/Shape.js";
import type { SvgDocument } from "../domain/SvgDocument.js";
import { AbstractCommand } from "./AbstractCommand.js";
import { ShapePlacement } from "./ShapePlacement.js";

export class DeleteCommand extends AbstractCommand {
  private placement: ShapePlacement | undefined;

  public constructor(private readonly document: SvgDocument, private readonly shape: Shape) {
    super();
  }

  protected executeInternal(): void {
    if (this.placement === undefined) this.placement = ShapePlacement.capture(this.document, this.shape);
    this.document.removeShape(this.shape.id);
  }

  protected undoInternal(): void {
    this.document.addShapeAt(this.shape, this.placement!.parent, this.placement!.index);
  }
}