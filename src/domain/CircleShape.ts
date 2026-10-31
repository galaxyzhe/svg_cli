import { DomainError } from "./DomainError.js";
import { Shape, type ShapeAttributeValue } from "./Shape.js";

export class CircleShape extends Shape {
  public readonly type = "circle";

  public constructor(
    id: string,
    private cx: number,
    private cy: number,
    private r: number,
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
    this.r *= factor;
  }

  public setAttribute(attribute: string, value: string): void {
    if (this.setCommonAttribute(attribute, value)) return;
    if (attribute === "cx") this.cx = this.parseNumber(value, attribute);
    else if (attribute === "cy") this.cy = this.parseNumber(value, attribute);
    else if (attribute === "r") this.r = this.parseNumber(value, attribute);
    else throw new DomainError(`unknown attribute: ${attribute}`);
  }

  public getAttributes(): Readonly<Record<string, ShapeAttributeValue>> {
    return { ...this.getStyleAttributes(), cx: this.cx, cy: this.cy, r: this.r };
  }

  public toSvg(): string {
    return this.serializeElement("circle", this.getAttributes());
  }

  private validateGeometry(): void {
    this.validateFinite(this.cx, "cx");
    this.validateFinite(this.cy, "cy");
    this.validateFinite(this.r, "r");
  }
}