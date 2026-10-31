import { describe, expect, it } from "vitest";
import { CircleShape } from "../src/domain/CircleShape.js";
import { DomainError } from "../src/domain/DomainError.js";
import { EllipseShape } from "../src/domain/EllipseShape.js";
import { GroupShape } from "../src/domain/GroupShape.js";
import { LineShape } from "../src/domain/LineShape.js";
import { RectShape } from "../src/domain/RectShape.js";
import { SvgDocument } from "../src/domain/SvgDocument.js";
import { TextShape } from "../src/domain/TextShape.js";

describe("shape geometry", () => {
  it("constructs every built-in shape with its geometry", () => {
    expect(new RectShape("r", 1, 2, 3, 4).getAttributes()).toMatchObject({ x: 1, y: 2, width: 3, height: 4 });
    expect(new CircleShape("c", 1, 2, 3).getAttributes()).toMatchObject({ cx: 1, cy: 2, r: 3 });
    expect(new EllipseShape("e", 1, 2, 3, 4).getAttributes()).toMatchObject({ cx: 1, cy: 2, rx: 3, ry: 4 });
    expect(new LineShape("l", 1, 2, 3, 4).getAttributes()).toMatchObject({ x1: 1, y1: 2, x2: 3, y2: 4 });
    expect(new TextShape("t", 1, 2, "hello").getAttributes()).toMatchObject({ x: 1, y: 2, text: "hello" });
    expect(new GroupShape("g").getAttributes()).toEqual({});
  });

  it("moves and scales each geometry according to its SVG coordinates", () => {
    const rect = new RectShape("r", 1, 2, 3, 4);
    const circle = new CircleShape("c", 1, 2, 3);
    const ellipse = new EllipseShape("e", 1, 2, 3, 4);
    const line = new LineShape("l", 1, 2, 3, 4);
    const text = new TextShape("t", 1, 2, "hello");

    rect.move(0.5, -0.5);
    circle.move(0.5, -0.5);
    ellipse.move(0.5, -0.5);
    line.move(0.5, -0.5);
    text.move(0.5, -0.5);
    rect.scale(2);
    circle.scale(2);
    ellipse.scale(2);
    line.scale(2);
    text.scale(2);

    expect(rect.getAttributes()).toMatchObject({ x: 3, y: 3, width: 6, height: 8 });
    expect(circle.getAttributes()).toMatchObject({ cx: 3, cy: 3, r: 6 });
    expect(ellipse.getAttributes()).toMatchObject({ cx: 3, cy: 3, rx: 6, ry: 8 });
    expect(line.getAttributes()).toMatchObject({ x1: 3, y1: 3, x2: 7, y2: 7 });
    expect(text.getAttributes()).toMatchObject({ x: 3, y: 3, text: "hello" });
  });
});

describe("composite document structure", () => {
  it("recursively moves and scales nested groups exactly once", () => {
    const document = new SvgDocument();
    const outer = new GroupShape("outer");
    const inner = new GroupShape("inner");
    const rect = new RectShape("rect", 1, 2, 3, 4);
    inner.addChild(rect);
    outer.addChild(inner);
    document.addShape(outer);

    outer.move(10, 20);
    expect(rect.getAttributes()).toMatchObject({ x: 11, y: 22 });
    outer.scale(2);
    expect(rect.getAttributes()).toMatchObject({ x: 22, y: 44, width: 6, height: 8 });
    expect(document.findShape("rect")).toBe(rect);
    expect(rect.parent).toBe(inner);
  });

  it("keeps ids globally unique and case sensitive", () => {
    const document = new SvgDocument();
    document.addShape(new RectShape("shape", 0, 0, 1, 1));
    document.addShape(new CircleShape("Shape", 0, 0, 1));

    expect(document.findShape("shape")?.type).toBe("rect");
    expect(document.findShape("Shape")?.type).toBe("circle");
    expect(() => document.addShape(new LineShape("shape", 0, 0, 1, 1))).toThrow("id already exists: shape");
    expect(() => document.getShape("missing")).toThrow("no such shape: missing");
  });

  it("rejects multiple parents and cycles", () => {
    const document = new SvgDocument();
    const first = new GroupShape("first");
    const second = new GroupShape("second");
    const rect = new RectShape("rect", 0, 0, 1, 1);
    document.addShape(first);
    document.addShape(second);
    document.addShape(rect, "first");

    expect(() => document.addShape(rect, "second")).toThrow("shape already has a parent: rect");
    const detached = new GroupShape("detached");
    expect(() => detached.addChild(detached)).toThrow("cannot create cycle");
    document.moveShape("first", "second");
    expect(() => document.moveShape("second", "first")).toThrow("cannot create cycle");
  });

  it("preserves child order while changing parent", () => {
    const document = new SvgDocument();
    const first = new RectShape("first", 0, 0, 1, 1);
    const second = new CircleShape("second", 0, 0, 1);
    const group = new GroupShape("group");
    document.addShape(first);
    document.addShape(second);
    document.addShape(group);
    document.moveShape("first", "group");
    document.moveShape("second", "group");

    expect(group.getChildren().map((shape) => shape.id)).toEqual(["first", "second"]);
    document.moveShape("first");
    expect(group.getChildren().map((shape) => shape.id)).toEqual(["second"]);
    expect(document.roots.map((shape) => shape.id)).toEqual(["group", "first"]);
  });

  it("protects the document index from direct mutation of an attached group", () => {
    const document = new SvgDocument();
    const group = new GroupShape("group");
    document.addShape(group);
    const child = new RectShape("child", 0, 0, 1, 1);

    expect(() => group.addChild(child)).toThrow("document-managed");
    expect(document.findShape("child")).toBeUndefined();
    expect(group.getChildren()).toEqual([]);
  });
});

describe("attributes and validation", () => {
  it("accepts only the shape-specific and common attributes", () => {
    const rect = new RectShape("rect", 0, 0, 1, 1);
    const text = new TextShape("text", 0, 0, "old");
    rect.setAttribute("fill", "red");
    rect.setAttribute("stroke-width", "1.5");
    rect.setAttribute("width", "2.5");
    text.setAttribute("text", "new");
    text.setAttribute("x", "1.25");

    expect(rect.getAttributes()).toMatchObject({ fill: "red", "stroke-width": "1.5", width: 2.5 });
    expect(text.getAttributes()).toMatchObject({ text: "new", x: 1.25 });
    expect(() => rect.setAttribute("text", "wrong")).toThrow("unknown attribute: text");
    expect(() => text.setAttribute("width", "2")).toThrow("unknown attribute: width");
    expect(() => rect.setAttribute("unknown", "value")).toThrow("unknown attribute: unknown");
  });

  it("rejects invalid scale factors and non-finite geometry", () => {
    expect(() => new RectShape("rect", Number.NaN, 0, 1, 1)).toThrow(DomainError);
    expect(() => new RectShape("rect", 0, 0, 1, 1).scale(0)).toThrow("scale factor must be positive");
    expect(() => new CircleShape("circle", 0, 0, 1).setAttribute("r", "Infinity")).toThrow("must be finite");
  });

  it("supports floating-point coordinates and dimensions", () => {
    const ellipse = new EllipseShape("ellipse", 1.25, -2.5, 0.75, 4.5);
    ellipse.move(0.1, 0.2);
    ellipse.scale(0.5);
    expect(ellipse.getAttributes()).toMatchObject({ cx: 0.675, cy: -1.15, rx: 0.375, ry: 2.25 });
  });

  it("does not expose mutable canvas viewBox state", () => {
    const document = new SvgDocument(100, 80);
    const externalViewBox = document.viewBox as { minX: number; minY: number; width: number; height: number };
    externalViewBox.width = 999;

    expect(document.viewBox.width).toBe(100);
    expect(document.width).toBe(100);
  });

  it("serializes polymorphically and escapes text content", () => {
    const group = new GroupShape("group");
    const text = new TextShape("label", 1, 2, "A < B & C");
    group.addChild(text);
    group.setAttribute("fill", "red");

    expect(text.toSvg()).toBe('<text id="label" x="1" y="2">A &lt; B &amp; C</text>');
    expect(group.toSvg()).toBe('<g id="group" fill="red"><text id="label" x="1" y="2">A &lt; B &amp; C</text></g>');
  });
});