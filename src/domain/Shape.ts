import { DomainError } from "./DomainError.js";
import type { GroupShape } from "./GroupShape.js";

export type ShapeAttributeValue = number | string;

export abstract class Shape {
  private parentShape: GroupShape | null = null;
  private readonly styleAttributes = new Map<string, string>();

  public constructor(public readonly id: string) {
    if (id.length === 0) {
      throw new DomainError("shape id must not be empty");
    }
  }

  public abstract readonly type: string;

  public get parent(): GroupShape | null {
    return this.parentShape;
  }

  public abstract move(deltaX: number, deltaY: number): void;

  public abstract scale(factor: number): void;

  public abstract setAttribute(attribute: string, value: string): void;

  public abstract getAttributes(): Readonly<Record<string, ShapeAttributeValue>>;

  public abstract toSvg(): string;

  public getAttribute(attribute: string): ShapeAttributeValue | undefined {
    return this.getAttributes()[attribute];
  }

  public removeAttribute(attribute: string): void {
    if (attribute !== "fill" && attribute !== "stroke" && attribute !== "stroke-width") {
      throw new DomainError(`cannot remove attribute: ${attribute}`);
    }
    this.styleAttributes.delete(attribute);
  }

  public getChildren(): readonly Shape[] {
    return [];
  }

  public contains(candidate: Shape): boolean {
    return this.getChildren().some((child) => child === candidate || child.contains(candidate));
  }

  public describe(): string {
    return `${this.type}#${this.id}`;
  }

  public assignParent(parent: GroupShape | null): void {
    this.parentShape = parent;
  }

  protected validateMove(deltaX: number, deltaY: number): void {
    this.validateFinite(deltaX, "move delta x");
    this.validateFinite(deltaY, "move delta y");
  }

  protected validateScale(factor: number): void {
    this.validateFinite(factor, "scale factor");
    if (factor <= 0) {
      throw new DomainError("scale factor must be positive");
    }
  }

  protected validateFinite(value: number, name: string): void {
    if (!Number.isFinite(value)) {
      throw new DomainError(`${name} must be finite`);
    }
  }

  protected parseNumber(value: string, attribute: string): number {
    const parsed = Number(value);
    this.validateFinite(parsed, attribute);
    return parsed;
  }

  protected setCommonAttribute(attribute: string, value: string): boolean {
    if (attribute !== "fill" && attribute !== "stroke" && attribute !== "stroke-width") {
      return false;
    }
    if (attribute === "stroke-width") {
      const strokeWidth = this.parseNumber(value, attribute);
      if (strokeWidth < 0) {
        throw new DomainError("stroke-width must not be negative");
      }
    }
    this.styleAttributes.set(attribute, value);
    return true;
  }

  protected getStyleAttributes(): Readonly<Record<string, string>> {
    return Object.fromEntries(this.styleAttributes);
  }

  protected serializeElement(tag: string, attributes: Readonly<Record<string, ShapeAttributeValue>>): string {
    const serializedAttributes = Object.entries(attributes)
      .map(([name, value]) => `${name}="${this.escapeXml(String(value))}"`)
      .join(" ");
    const idAttribute = `id="${this.escapeXml(this.id)}"`;
    return `<${tag} ${idAttribute}${serializedAttributes.length > 0 ? ` ${serializedAttributes}` : ""}/>`;
  }

  protected escapeXml(value: string): string {
    return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;").replaceAll("'", "&apos;");
  }
}