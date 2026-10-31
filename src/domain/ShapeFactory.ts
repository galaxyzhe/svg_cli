import { CircleShape } from "./CircleShape.js";
import { DomainError } from "./DomainError.js";
import { EllipseShape } from "./EllipseShape.js";
import { GroupShape } from "./GroupShape.js";
import { LineShape } from "./LineShape.js";
import { RectShape } from "./RectShape.js";
import { Shape } from "./Shape.js";
import { TextShape } from "./TextShape.js";

export type ShapeFactoryAttributes = Readonly<Record<string, string>>;

export class ShapeFactory {
  public create(type: string, id: string, attributes: ShapeFactoryAttributes = {}, text = ""): Shape {
    let shape: Shape;
    switch (type) {
      case "rect":
        shape = new RectShape(id, this.number(attributes, "x"), this.number(attributes, "y"),
          this.number(attributes, "width"), this.number(attributes, "height"));
        break;
      case "circle":
        shape = new CircleShape(id, this.number(attributes, "cx"), this.number(attributes, "cy"), this.number(attributes, "r"));
        break;
      case "ellipse":
        shape = new EllipseShape(id, this.number(attributes, "cx"), this.number(attributes, "cy"),
          this.number(attributes, "rx"), this.number(attributes, "ry"));
        break;
      case "line":
        shape = new LineShape(id, this.number(attributes, "x1"), this.number(attributes, "y1"),
          this.number(attributes, "x2"), this.number(attributes, "y2"));
        break;
      case "text":
        shape = new TextShape(id, this.number(attributes, "x"), this.number(attributes, "y"), text);
        break;
      case "g":
        shape = new GroupShape(id);
        break;
      default:
        throw new DomainError(`unknown shape type: ${type}`);
    }

    for (const attribute of ["fill", "stroke", "stroke-width"]) {
      const value = attributes[attribute];
      if (value !== undefined) shape.setAttribute(attribute, value);
    }
    return shape;
  }

  private number(attributes: ShapeFactoryAttributes, name: string): number {
    const value = attributes[name];
    if (value === undefined) throw new DomainError(`missing shape attribute: ${name}`);
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) throw new DomainError(`invalid shape attribute: ${name}`);
    return parsed;
  }
}