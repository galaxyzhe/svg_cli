import type { Shape } from "../domain/Shape.js";
import type { GroupShape } from "../domain/GroupShape.js";
import type { SvgDocument } from "../domain/SvgDocument.js";
import { AbstractCommand } from "./AbstractCommand.js";

export class CreateCommand extends AbstractCommand {
  private insertionIndex: number | undefined;

  public constructor(
    private readonly document: SvgDocument,
    private readonly shape: Shape,
    private readonly parent: GroupShape | null = null,
  ) {
    super();
  }

  protected executeInternal(): void {
    if (this.insertionIndex === undefined) {
      this.insertionIndex = this.parent === null ? this.document.roots.length : this.parent.getChildren().length;
    }
    this.document.addShapeAt(this.shape, this.parent, this.insertionIndex);
  }

  protected undoInternal(): void {
    this.document.removeShape(this.shape.id);
  }
}