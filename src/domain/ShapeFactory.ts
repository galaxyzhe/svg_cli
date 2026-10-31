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
  public createFromParameters(type: string, id: string, parameters: readonly string[]): Shape {
    switch (type) {
      case "rect":
        return this.create(type, id, this.attributes(parameters, ["x", "y", "width", "height"], "fill"));
      case "circle":
        return this.create(type, id, this.attributes(parameters, ["cx", "cy", "r"], "fill"));
      case "ellipse":
        return this.create(type, id, this.attributes(parameters, ["cx", "cy", "rx", "ry"], "fill"));
      case "line":
        return this.create(type, id, this.attributes(parameters, ["x1", "y1", "x2", "y2"], "stroke"));
      case "text": {
        if (parameters.length !== 3) throw new DomainError("invalid create parameters for text");
        return this.create(type, id, { x: parameters[0]!, y: parameters[1]! }, parameters[2]);
      }
      case "g":
        if (parameters.length !== 0) throw new DomainError("invalid create parameters for g");
        return this.create(type, id);
      default:
        throw new DomainError(`unknown shape type: ${type}`);
    }
  }

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

  private attributes(parameters: readonly string[], required: readonly string[], optional: string): Record<string, string> {
    if (parameters.length !== required.length && parameters.length !== required.length + 1) {
      throw new DomainError("invalid create parameters");
    }
    const attributes: Record<string, string> = {};
    required.forEach((name, index) => {
      const value = parameters[index];
      if (value === undefined) throw new DomainError(`missing create parameter: ${name}`);
      attributes[name] = value;
    });
    const optionalValue = parameters[required.length];
    if (optionalValue !== undefined) attributes[optional] = optionalValue;
    return attributes;
  }
}