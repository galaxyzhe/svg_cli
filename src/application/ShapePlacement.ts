import { DomainError } from "../domain/DomainError.js";
import type { GroupShape } from "../domain/GroupShape.js";
import type { Shape } from "../domain/Shape.js";
import type { SvgDocument } from "../domain/SvgDocument.js";

export class ShapePlacement {
  public constructor(public readonly parent: GroupShape | null, public readonly index: number) {}

  public static capture(document: SvgDocument, shape: Shape): ShapePlacement {
    if (document.findShape(shape.id) !== shape) throw new DomainError(`no such shape: ${shape.id}`);
    return new ShapePlacement(shape.parent, document.getShapeIndex(shape));
  }
}