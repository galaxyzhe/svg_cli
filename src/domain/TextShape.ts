import { DomainError } from "./DomainError.js";
import { Shape, type ShapeAttributeValue } from "./Shape.js";

export class TextShape extends Shape {
  public readonly type = "text";

  public constructor(
    id: string,
    private x: number,
    private y: number,
    private content: string,
  ) {
    super(id);
    this.validateFinite(x, "x");
    this.validateFinite(y, "y");
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
  }

  public setAttribute(attribute: string, value: string): void {
    if (this.setCommonAttribute(attribute, value)) return;
    if (attribute === "x") this.x = this.parseNumber(value, attribute);
    else if (attribute === "y") this.y = this.parseNumber(value, attribute);
    else if (attribute === "text") this.content = value;
    else throw new DomainError(`unknown attribute: ${attribute}`);
  }

  public getAttributes(): Readonly<Record<string, ShapeAttributeValue>> {
    return { ...this.getStyleAttributes(), x: this.x, y: this.y, text: this.content };
  }

  public toSvg(): string {
    const { text: _text, ...attributes } = this.getAttributes();
    return `<text ${`id="${this.escapeXml(this.id)}"`} ${Object.entries(attributes)
      .map(([name, value]) => `${name}="${this.escapeXml(String(value))}"`)
      .join(" ")}>${this.escapeXml(this.content)}</text>`;
  }

  public get text(): string {
    return this.content;
  }
}