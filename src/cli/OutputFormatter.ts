import type { Shape, ShapeAttributeValue } from "../domain/Shape.js";
import type { SvgDocument } from "../domain/SvgDocument.js";

export class OutputFormatter {
  public tree(document: SvgDocument, root?: Shape): string {
    if (root !== undefined) return this.renderShape(root, "", true, true);
    const lines = [`svg (${document.width}x${document.height})`];
    document.roots.forEach((shape, index) => lines.push(this.renderShape(shape, "", index === document.roots.length - 1)));
    return lines.join("\n");
  }

  public show(shape: Shape): string {
    const parent = shape.parent === null ? "svg" : shape.parent.describe();
    const lines = [`${shape.describe()}  parent=${parent}`];
    for (const [name, value] of this.orderedAttributes(shape)) {
      lines.push(`  ${name}=${this.formatValue(name, value)}`);
    }
    return lines.join("\n");
  }

  public help(): string {
    return [
      "Commands:",
      "  init [w] [h]                 create a canvas (default 800x600)",
      "  read <file.svg>              read an SVG file",
      "  save [file.svg]              save the current SVG",
      "  canvas [w] [h]               show or change canvas size",
      "  create rect <id> <x> <y> <w> <h> [fill]",
      "  create circle <id> <cx> <cy> <r> [fill]",
      "  create ellipse <id> <cx> <cy> <rx> <ry> [fill]",
      "  create line <id> <x1> <y1> <x2> <y2> [stroke]",
      "  create text <id> <x> <y> \"content\"",
      "  create g <id>",
      "  delete <id>                   delete a shape",
      "  move <id> <dx> <dy>          move a shape",
      "  scale <id> <factor>          scale a shape",
      "  set <id> <attr> <value>      set a whitelisted attribute",
      "  group <gid> <id1> <id2>...  group existing shapes",
      "  ungroup <gid>                dissolve a g container",
      "  addto <gid> <id>             move an existing shape into g",
      "  front <id> / back <id>       change z-order",
      "  tree [id]                    show the structure tree",
      "  show <id>                    show shape details",
      "  undo / redo                  edit history",
      "  help                         show this help",
      "  exit / quit                  leave the editor",
    ].join("\n");
  }

  private renderShape(shape: Shape, prefix: string, last: boolean, topLevel = false): string {
    const connector = topLevel ? "" : last ? "└── " : "├── ";
    const lines = [`${prefix}${connector}${this.describeShape(shape)}`];
    const childPrefix = topLevel ? "" : `${prefix}${last ? "    " : "│   "}`;
    const children = shape.getChildren();
    children.forEach((child, index) => lines.push(this.renderShape(child, childPrefix, index === children.length - 1)));
    return lines.join("\n");
  }

  private describeShape(shape: Shape): string {
    const attributes = this.orderedAttributes(shape);
    if (attributes.length === 0) return shape.describe();
    const text = shape.getAttribute("text");
    if (typeof text === "string") {
      const x = shape.getAttribute("x");
      const y = shape.getAttribute("y");
      return `${shape.describe()} (${String(x)},${String(y)}) "${text}"`;
    }
    return `${shape.describe()}  ${attributes.map(([name, value]) => `${name}=${this.formatValue(name, value)}`).join(" ")}`;
  }

  private formatValue(name: string, value: ShapeAttributeValue): string {
    return name === "text" ? `"${String(value)}"` : String(value);
  }

  private orderedAttributes(shape: Shape): readonly [string, ShapeAttributeValue][] {
    return Object.entries(shape.getAttributes()).sort(([left], [right]) =>
      this.isStyleAttribute(left) === this.isStyleAttribute(right) ? 0 : this.isStyleAttribute(left) ? 1 : -1);
  }

  private isStyleAttribute(name: string): boolean {
    return name === "fill" || name === "stroke" || name === "stroke-width";
  }
}