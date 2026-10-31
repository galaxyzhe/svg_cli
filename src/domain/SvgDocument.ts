import { DomainError } from "./DomainError.js";
import { GroupShape } from "./GroupShape.js";
import { Shape } from "./Shape.js";

export class SvgDocument {
  private readonly rootShapes: Shape[] = [];
  private readonly shapesById = new Map<string, Shape>();

  public constructor(public width = 800, public height = 600) {
    this.validateCanvasDimension(width, "width");
    this.validateCanvasDimension(height, "height");
  }

  public get roots(): readonly Shape[] {
    return this.rootShapes;
  }

  public findShape(id: string): Shape | undefined {
    return this.shapesById.get(id);
  }

  public getShape(id: string): Shape {
    const shape = this.findShape(id);
    if (!shape) throw new DomainError(`no such shape: ${id}`);
    return shape;
  }

  public addShape(shape: Shape, parentId?: string): void {
    if (shape.parent !== null) {
      throw new DomainError(`shape already has a parent: ${shape.id}`);
    }
    const nodes = this.collectNodes(shape);
    const localIds = new Set<string>();
    for (const node of nodes) {
      if (localIds.has(node.id) || this.shapesById.has(node.id)) {
        throw new DomainError(`id already exists: ${node.id}`);
      }
      localIds.add(node.id);
    }

    const parent = parentId === undefined ? null : this.getShape(parentId);
    if (parent !== null && !(parent instanceof GroupShape)) {
      throw new DomainError(`not a container: ${parentId}`);
    }

    if (parent === null) this.rootShapes.push(shape);
    else parent.addChild(shape);
    for (const node of nodes) this.shapesById.set(node.id, node);
  }

  public removeShape(id: string): Shape {
    const shape = this.getShape(id);
    if (shape.parent === null) {
      const index = this.rootShapes.indexOf(shape);
      this.rootShapes.splice(index, 1);
    } else {
      shape.parent.removeChild(shape);
    }
    for (const node of this.collectNodes(shape)) this.shapesById.delete(node.id);
    return shape;
  }

  public moveShape(id: string, parentId?: string): void {
    const shape = this.getShape(id);
    const destination = parentId === undefined ? null : this.getShape(parentId);
    if (destination !== null && !(destination instanceof GroupShape)) {
      throw new DomainError(`not a container: ${parentId}`);
    }
    if (destination === shape || (destination !== null && shape.contains(destination))) {
      throw new DomainError(`cannot create cycle involving: ${shape.id}`);
    }
    if (shape.parent === destination) return;

    const originalParent = shape.parent;
    if (originalParent === null) {
      this.rootShapes.splice(this.rootShapes.indexOf(shape), 1);
    } else {
      originalParent.removeChild(shape);
    }

    if (destination === null) {
      this.rootShapes.push(shape);
    } else {
      destination.addChild(shape);
    }
  }

  public setCanvasSize(width: number, height: number): void {
    this.validateCanvasDimension(width, "width");
    this.validateCanvasDimension(height, "height");
    this.width = width;
    this.height = height;
  }

  private collectNodes(shape: Shape): Shape[] {
    const nodes: Shape[] = [shape];
    for (const child of shape.getChildren()) nodes.push(...this.collectNodes(child));
    return nodes;
  }

  private validateCanvasDimension(value: number, name: string): void {
    if (!Number.isFinite(value) || value < 0) {
      throw new DomainError(`${name} must be a non-negative finite number`);
    }
  }
}