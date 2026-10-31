import { DomainError } from "./DomainError.js";
import { Shape, type ShapeAttributeValue } from "./Shape.js";
import { documentTreeToken, ShapeTreeToken } from "./ShapeTreeToken.js";

export class GroupShape extends Shape {
  public readonly type = "g";
  private readonly children: Shape[] = [];
  private documentManaged = false;

  public override getChildren(): readonly Shape[] {
    return this.children;
  }

  public move(deltaX: number, deltaY: number): void {
    this.validateMove(deltaX, deltaY);
    for (const child of this.children) child.move(deltaX, deltaY);
  }

  public scale(factor: number): void {
    this.validateScale(factor);
    for (const child of this.children) child.scale(factor);
  }

  public setAttribute(attribute: string, value: string): void {
    if (!this.setCommonAttribute(attribute, value)) {
      throw new DomainError(`unknown attribute: ${attribute}`);
    }
  }

  public getAttributes(): Readonly<Record<string, ShapeAttributeValue>> {
    return this.getStyleAttributes();
  }

  public toSvg(): string {
    const attributes = Object.entries(this.getAttributes())
      .map(([name, value]) => `${name}="${this.escapeXml(String(value))}"`)
      .join(" ");
    const idAttribute = `id="${this.escapeXml(this.id)}"`;
    const openingTag = `<g ${idAttribute}${attributes.length > 0 ? ` ${attributes}` : ""}>`;
    return `${openingTag}${this.children.map((child) => child.toSvg()).join("")}</g>`;
  }

  public addChild(child: Shape): void {
    this.assertDetachedMutationAllowed();
    this.addChildRaw(child);
  }

  public addChildAtManaged(child: Shape, index: number, token: ShapeTreeToken): void {
    this.assertToken(token);
    this.addChildRaw(child, index);
  }

  public removeChild(child: Shape): void {
    this.assertDetachedMutationAllowed();
    this.removeChildRaw(child);
  }

  public removeChildManaged(child: Shape, token: ShapeTreeToken): void {
    this.assertToken(token);
    this.removeChildRaw(child);
  }

  public insertChildAt(child: Shape, index: number): void {
    this.assertDetachedMutationAllowed();
    this.addChildRaw(child, index);
  }

  public markDocumentManaged(token: ShapeTreeToken): void {
    this.assertToken(token);
    this.documentManaged = true;
    for (const child of this.children) {
      if (child instanceof GroupShape) child.markDocumentManaged(token);
    }
  }

  public markDocumentDetached(token: ShapeTreeToken): void {
    this.assertToken(token);
    this.documentManaged = false;
    for (const child of this.children) {
      if (child instanceof GroupShape) child.markDocumentDetached(token);
    }
  }

  private addChildRaw(child: Shape, index = this.children.length): void {
    if (index < 0 || index > this.children.length) {
      throw new DomainError(`child index out of range: ${index}`);
    }
    if (child === this || child.contains(this)) {
      throw new DomainError(`cannot create cycle involving: ${child.id}`);
    }
    if (child.parent !== null) {
      throw new DomainError(`shape already has a parent: ${child.id}`);
    }
    this.children.splice(index, 0, child);
    child.assignParent(this, documentTreeToken);
  }

  private removeChildRaw(child: Shape): void {
    const index = this.children.indexOf(child);
    if (index < 0) {
      throw new DomainError(`shape is not a child of: ${this.id}`);
    }
    this.children.splice(index, 1);
    child.assignParent(null, documentTreeToken);
  }

  private assertDetachedMutationAllowed(): void {
    if (this.documentManaged) throw new DomainError("shape is document-managed; use SvgDocument");
  }

  private assertToken(token: ShapeTreeToken): void {
    if (token !== documentTreeToken) throw new DomainError("invalid shape tree token");
  }

  public getChildIndex(child: Shape): number {
    return this.children.indexOf(child);
  }
}