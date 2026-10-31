import { DomainError } from "../domain/DomainError.js";
import { GroupShape } from "../domain/GroupShape.js";
import type { Shape } from "../domain/Shape.js";
import type { SvgDocument } from "../domain/SvgDocument.js";
import { AbstractCommand } from "./AbstractCommand.js";
import { ShapePlacement } from "./ShapePlacement.js";

interface TargetPlacement {
  shape: Shape;
  placement: ShapePlacement;
  order: number;
}

export class GroupCommand extends AbstractCommand {
  private targets: TargetPlacement[] | undefined;
  private parent: GroupShape | null | undefined;
  private insertionIndex: number | undefined;

  public constructor(
    private readonly document: SvgDocument,
    private readonly group: GroupShape,
    private readonly requestedTargets: readonly Shape[],
  ) {
    super();
  }

  protected executeInternal(): void {
    this.captureAndValidate();
    this.document.addShapeAt(this.group, this.parent!, this.insertionIndex!);
    for (const target of this.targets!) {
      this.document.moveShapeAt(target.shape, this.group, this.group.getChildren().length);
    }
  }

  protected undoInternal(): void {
    const restoredTargets = [...this.targets!].sort((left, right) => right.placement.index - left.placement.index);
    for (const target of restoredTargets) {
      this.document.moveShapeAt(target.shape, target.placement.parent, target.placement.index);
    }
    this.document.removeShape(this.group.id);
  }

  private captureAndValidate(): void {
    if (this.targets !== undefined) return;
    if (this.requestedTargets.length === 0) throw new DomainError("group requires at least one shape");
    if (this.group.getChildren().length > 0) throw new DomainError(`group must be empty: ${this.group.id}`);
    if (this.document.findShape(this.group.id) !== undefined) {
      throw new DomainError(`id already exists: ${this.group.id}`);
    }

    const placements = this.requestedTargets.map((shape, order) => ({
      shape,
      placement: ShapePlacement.capture(this.document, shape),
      order,
    }));
    const ids = new Set<string>();
    for (const target of placements) {
      if (ids.has(target.shape.id)) throw new DomainError(`duplicate group target: ${target.shape.id}`);
      ids.add(target.shape.id);
    }
    for (let left = 0; left < placements.length; left += 1) {
      for (let right = left + 1; right < placements.length; right += 1) {
        const leftTarget = placements[left];
        const rightTarget = placements[right];
        if (leftTarget !== undefined && rightTarget !== undefined) {
          if (leftTarget.shape.contains(rightTarget.shape)) {
            throw new DomainError(`cannot group a container into its own descendant: ${leftTarget.shape.id}`);
          }
          if (rightTarget.shape.contains(leftTarget.shape)) {
            throw new DomainError(`cannot group a container into its own descendant: ${rightTarget.shape.id}`);
          }
        }
      }
    }

    const firstTarget = placements[0];
    if (firstTarget === undefined) throw new DomainError("group requires at least one shape");
    this.parent = firstTarget.placement.parent;
    const sameParent = placements.filter((target) => target.placement.parent === this.parent);
    this.insertionIndex = Math.min(...sameParent.map((target) => target.placement.index));
    this.targets = placements.sort((left, right) => {
      if (left.placement.parent === right.placement.parent) return left.placement.index - right.placement.index;
      return left.order - right.order;
    });
  }
}