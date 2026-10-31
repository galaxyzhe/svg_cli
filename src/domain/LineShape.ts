import { DomainError } from "./DomainError.js";
import { Shape, type ShapeAttributeValue } from "./Shape.js";

export class LineShape extends Shape {
  public readonly type = "line";

  public constructor(
    id: string,
    private x1: number,
    private y1: number,
    private x2: number,
    private y2: number,
  ) {
    super(id);
    this.validateGeometry();
  }

  public move(deltaX: number, deltaY: number): void {
    this.validateMove(deltaX, deltaY);
    this.x1 += deltaX;
    this.y1 += deltaY;
    this.x2 += deltaX;
    this.y2 += deltaY;
  }

  public scale(factor: number): void {
    this.validateScale(factor);
    this.x1 *= factor;
    this.y1 *= factor;
    this.x2 *= factor;
    this.y2 *= factor;
  }

  public setAttribute(attribute: string, value: string): void {
    if (this.setCommonAttribute(attribute, value)) return;
    if (attribute === "x1") this.x1 = this.parseNumber(value, attribute);
    else if (attribute === "y1") this.y1 = this.parseNumber(value, attribute);
    else if (attribute === "x2") this.x2 = this.parseNumber(value, attribute);
    else if (attribute === "y2") this.y2 = this.parseNumber(value, attribute);
    else throw new DomainError(`unknown attribute: ${attribute}`);
  }

  public getAttributes(): Readonly<Record<string, ShapeAttributeValue>> {
    return { ...this.getStyleAttributes(), x1: this.x1, y1: this.y1, x2: this.x2, y2: this.y2 };
  }

  public toSvg(): string {
    return this.serializeElement("line", this.getAttributes());
  }

  private validateGeometry(): void {
    this.validateFinite(this.x1, "x1");
    this.validateFinite(this.y1, "y1");
    this.validateFinite(this.x2, "x2");
    this.validateFinite(this.y2, "y2");
  }
}