import { DomainError } from "./DomainError.js";
import { GroupShape } from "./GroupShape.js";
import { Shape } from "./Shape.js";

export interface SvgViewBox {
  readonly minX: number;
  readonly minY: number;
  readonly width: number;
  readonly height: number;
}

export class SvgDocument {
  private readonly rootShapes: Shape[] = [];
  private readonly shapesById = new Map<string, Shape>();

  public constructor(
    public width = 800,
    public height = 600,
    public viewBox: SvgViewBox = { minX: 0, minY: 0, width, height },
  ) {
    this.validateCanvasDimension(width, "width");
    this.validateCanvasDimension(height, "height");
    this.validateViewBox(viewBox);
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
    const parent = parentId === undefined ? null : this.getShape(parentId);
    if (parent !== null && !(parent instanceof GroupShape)) {
      throw new DomainError(`not a container: ${parentId}`);
    }
    this.addShapeAt(shape, parent, parent === null ? this.rootShapes.length : parent.getChildren().length);
  }

  public addShapeAt(shape: Shape, parent: GroupShape | null, index: number): void {
    if (shape.parent !== null) {
      throw new DomainError(`shape already has a parent: ${shape.id}`);
    }
    this.validateParent(parent);
    const nodes = this.collectNodes(shape);
    const localIds = new Set<string>();
    for (const node of nodes) {
      if (localIds.has(node.id) || this.shapesById.has(node.id)) {
        throw new DomainError(`id already exists: ${node.id}`);
      }
      localIds.add(node.id);
    }

    const childCount = parent === null ? this.rootShapes.length : parent.getChildren().length;
    if (index < 0 || index > childCount) {
      throw new DomainError(`shape index out of range: ${index}`);
    }

    if (parent === null) this.rootShapes.splice(index, 0, shape);
    else parent.insertChildAt(shape, index);
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
    this.moveShapeAt(shape, destination, destination === null ? this.rootShapes.length : destination.getChildren().length);
  }

  public moveShapeAt(shape: Shape, destination: GroupShape | null, index: number): void {
    this.validateRegistered(shape);
    this.validateParent(destination);
    if (destination === shape || (destination !== null && shape.contains(destination))) {
      throw new DomainError(`cannot create cycle involving: ${shape.id}`);
    }
    const source = shape.parent;
    const destinationCount = destination === null ? this.rootShapes.length : destination.getChildren().length;
    const finalDestinationCount = source === destination ? destinationCount - 1 : destinationCount;
    if (index < 0 || index > finalDestinationCount) {
      throw new DomainError(`shape index out of range: ${index}`);
    }
    if (source === destination && this.getShapeIndex(shape) === index) return;

    this.detachShape(shape);
    if (destination === null) this.rootShapes.splice(index, 0, shape);
    else destination.insertChildAt(shape, index);
  }

  public getShapeIndex(shape: Shape): number {
    this.validateRegistered(shape);
    return shape.parent === null ? this.rootShapes.indexOf(shape) : shape.parent.getChildIndex(shape);
  }

  public ungroupShape(group: GroupShape): readonly Shape[] {
    this.validateRegistered(group);
    const parent = group.parent;
    if (parent === null) throw new DomainError(`cannot ungroup top-level container: ${group.id}`);
    const index = this.getShapeIndex(group);
    const children = [...group.getChildren()];
    this.detachShape(group);
    for (const node of this.collectNodes(group)) this.shapesById.delete(node.id);
    for (const child of children) {
      group.removeChild(child);
      this.insertShapeAt(child, parent, index + children.indexOf(child));
    }
    return children;
  }

  private insertShapeAt(shape: Shape, parent: GroupShape, index: number): void {
    parent.insertChildAt(shape, index);
    for (const node of this.collectNodes(shape)) this.shapesById.set(node.id, node);
  }

  private detachShape(shape: Shape): void {
    if (shape.parent === null) {
      const index = this.rootShapes.indexOf(shape);
      if (index < 0) throw new DomainError(`no such shape: ${shape.id}`);
      this.rootShapes.splice(index, 1);
    } else {
      shape.parent.removeChild(shape);
    }
  }

  private validateParent(parent: GroupShape | null): void {
    if (parent !== null) this.validateRegistered(parent);
  }

  private validateRegistered(shape: Shape): void {
    if (this.shapesById.get(shape.id) !== shape) {
      throw new DomainError(`no such shape: ${shape.id}`);
    }
  }

  public setCanvasSize(width: number, height: number): void {
    this.validateCanvasDimension(width, "width");
    this.validateCanvasDimension(height, "height");
    this.width = width;
    this.height = height;
    this.viewBox = { minX: this.viewBox.minX, minY: this.viewBox.minY, width, height };
  }

  public setViewBox(viewBox: SvgViewBox): void {
    this.validateViewBox(viewBox);
    this.viewBox = { ...viewBox };
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

  private validateViewBox(viewBox: SvgViewBox): void {
    this.validateFinite(viewBox.minX, "viewBox minX");
    this.validateFinite(viewBox.minY, "viewBox minY");
    this.validateCanvasDimension(viewBox.width, "viewBox width");
    this.validateCanvasDimension(viewBox.height, "viewBox height");
  }

  private validateFinite(value: number, name: string): void {
    if (!Number.isFinite(value)) throw new DomainError(`${name} must be finite`);
  }
}