import { DomainError } from "./DomainError.js";
import { Shape, type ShapeAttributeValue } from "./Shape.js";

export class RectShape extends Shape {
  public readonly type = "rect";

  public constructor(
    id: string,
    private x: number,
    private y: number,
    private width: number,
    private height: number,
  ) {
    super(id);
    this.validateGeometry();
  }

  public move(deltaX: number, deltaY: number): void {
    this.validateMove(deltaX, deltaY);
    this.x += deltaX;
    this.y += deltaY;
  }

  public scale(factor: number): void {
    this.validateScale(factor);
    this.x *= factor;
    this.y *= factor;
    this.width *= factor;
    this.height *= factor;
  }

  public setAttribute(attribute: string, value: string): void {
    if (this.setCommonAttribute(attribute, value)) return;
    if (attribute === "x") this.x = this.parseNumber(value, attribute);
    else if (attribute === "y") this.y = this.parseNumber(value, attribute);
    else if (attribute === "width") this.width = this.parseNumber(value, attribute);
    else if (attribute === "height") this.height = this.parseNumber(value, attribute);
    else throw new DomainError(`unknown attribute: ${attribute}`);
  }

  public getAttributes(): Readonly<Record<string, ShapeAttributeValue>> {
    return { ...this.getStyleAttributes(), x: this.x, y: this.y, width: this.width, height: this.height };
  }

  public toSvg(): string {
    return this.serializeElement("rect", this.getAttributes());
  }

  private validateGeometry(): void {
    this.validateFinite(this.x, "x");
    this.validateFinite(this.y, "y");
    this.validateFinite(this.width, "width");
    this.validateFinite(this.height, "height");
  }
}