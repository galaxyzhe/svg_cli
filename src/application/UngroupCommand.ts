import { DomainError } from "../domain/DomainError.js";
import { GroupShape } from "../domain/GroupShape.js";
import type { Shape } from "../domain/Shape.js";
import type { SvgDocument } from "../domain/SvgDocument.js";
import { AbstractCommand } from "./AbstractCommand.js";
import { ShapePlacement } from "./ShapePlacement.js";

export class UngroupCommand extends AbstractCommand {
  private placement: ShapePlacement | undefined;
  private children: readonly Shape[] | undefined;

  public constructor(private readonly document: SvgDocument, private readonly group: GroupShape) {
    super();
  }

  protected executeInternal(): void {
    if (this.placement === undefined) {
      this.placement = ShapePlacement.capture(this.document, this.group);
      if (this.placement.parent === null) {
        throw new DomainError(`cannot ungroup top-level container: ${this.group.id}`);
      }
      this.children = [...this.group.getChildren()];
    }
    this.document.ungroupShape(this.group);
  }

  protected undoInternal(): void {
    this.document.addShapeAt(this.group, this.placement!.parent, this.placement!.index);
    for (const child of this.children!) {
      this.document.moveShapeAt(child, this.group, this.group.getChildren().length);
    }
  }
}