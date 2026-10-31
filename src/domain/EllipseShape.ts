import { DomainError } from "./DomainError.js";
import { Shape, type ShapeAttributeValue } from "./Shape.js";

export class EllipseShape extends Shape {
  public readonly type = "ellipse";

  public constructor(
    id: string,
    private cx: number,
    private cy: number,
    private rx: number,
    private ry: number,
  ) {
    super(id);
    this.validateGeometry();
  }

  public move(deltaX: number, deltaY: number): void {
    this.validateMove(deltaX, deltaY);
    this.cx += deltaX;
    this.cy += deltaY;
  }

  public scale(factor: number): void {
    this.validateScale(factor);
    this.cx *= factor;
    this.cy *= factor;
    this.rx *= factor;
    this.ry *= factor;
  }

  public setAttribute(attribute: string, value: string): void {
    if (this.setCommonAttribute(attribute, value)) return;
    if (attribute === "cx") this.cx = this.parseNumber(value, attribute);
    else if (attribute === "cy") this.cy = this.parseNumber(value, attribute);
    else if (attribute === "rx") this.rx = this.parseNumber(value, attribute);
    else if (attribute === "ry") this.ry = this.parseNumber(value, attribute);
    else throw new DomainError(`unknown attribute: ${attribute}`);
  }

  public getAttributes(): Readonly<Record<string, ShapeAttributeValue>> {
    return { ...this.getStyleAttributes(), cx: this.cx, cy: this.cy, rx: this.rx, ry: this.ry };
  }

  public toSvg(): string {
    return this.serializeElement("ellipse", this.getAttributes());
  }

  private validateGeometry(): void {
    this.validateFinite(this.cx, "cx");
    this.validateFinite(this.cy, "cy");
    this.validateFinite(this.rx, "rx");
    this.validateFinite(this.ry, "ry");
  }
}