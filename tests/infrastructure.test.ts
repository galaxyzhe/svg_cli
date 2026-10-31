import { describe, expect, it } from "vitest";
import { ShapeFactory } from "../src/domain/ShapeFactory.js";
import { SvgDocument } from "../src/domain/SvgDocument.js";
import { GroupShape } from "../src/domain/GroupShape.js";
import { RectShape } from "../src/domain/RectShape.js";
import { TextShape } from "../src/domain/TextShape.js";
import { SvgReader } from "../src/infrastructure/SvgReader.js";
import { SvgIoError } from "../src/infrastructure/SvgIoError.js";
import { SvgWriter } from "../src/infrastructure/SvgWriter.js";

describe("ShapeFactory", () => {
  it("creates the six built-in types and rejects box", () => {
    const factory = new ShapeFactory();
    expect(factory.create("rect", "r", { x: "1", y: "2", width: "3", height: "4" }).type).toBe("rect");
    expect(factory.create("circle", "c", { cx: "1", cy: "2", r: "3" }).type).toBe("circle");
    expect(factory.create("ellipse", "e", { cx: "1", cy: "2", rx: "3", ry: "4" }).type).toBe("ellipse");
    expect(factory.create("line", "l", { x1: "1", y1: "2", x2: "3", y2: "4" }).type).toBe("line");
    expect(factory.create("text", "t", { x: "1", y: "2" }, "text").type).toBe("text");
    expect(factory.create("g", "g").type).toBe("g");
    expect(() => factory.create("box", "box")).toThrow("unknown shape type: box");
    expect(() => factory.create("hexagon", "hexagon")).toThrow("unknown shape type: hexagon");
  });
});

describe("SvgReader", () => {
  it("reads the sample structure, attributes, text and assigns missing ids", async () => {
    const warnings: string[] = [];
    const reader = new SvgReader(undefined, (message) => warnings.push(message));
    const document = await reader.readFile("tests/fixtures/other.svg");

    expect(document.width).toBe(400);
    expect(document.height).toBe(300);
    expect(document.viewBox).toEqual({ minX: 0, minY: 0, width: 400, height: 300 });
    expect(document.roots.map((shape) => shape.id)).toEqual(["rect1", "t1", "c1", "g1", "e1"]);
    expect(document.getShape("rect1").getAttributes()).toMatchObject({ width: 400, fill: "#ffffff" });
    expect((document.getShape("t1") as TextShape).text).toBe("导入 & 文本");
    expect((document.getShape("g1") as GroupShape).getChildren().map((shape) => shape.id)).toEqual(["r2", "c2"]);
    expect(warnings).toEqual(["warning: assigned id rect1 to unnamed <rect>"]);
  });

  it("keeps explicit duplicate ids as an error and rejects unsupported elements", () => {
    const warnings: string[] = [];
    const reader = new SvgReader(undefined, (message) => warnings.push(message));
    expect(() => reader.read('<svg width="10" height="10"><rect id="x" x="0" y="0" width="1" height="1"/><circle id="x" cx="0" cy="0" r="1"/></svg>'))
      .toThrow("id already exists: x");

    expect(() => reader.read('<svg width="10" height="10"><path id="p" d="ignored"/></svg>'))
      .toThrow("unknown shape type: path");
    expect(warnings).toEqual([]);
  });
});

describe("SvgWriter round-trip", () => {
  it("writes valid XML and preserves document data when read again", () => {
    const document = new SvgDocument(400, 300, { minX: 0, minY: 0, width: 400, height: 300 });
    const group = new GroupShape("group");
    const rect = new RectShape("rect", 1.5, 2.5, 30, 40);
    rect.setAttribute("fill", "#fff");
    const text = new TextShape("text", 3, 4, "中文 < &");
    group.addChild(rect);
    group.addChild(text);
    document.addShape(group);

    const xml = new SvgWriter().write(document);
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(xml).toContain("中文 &lt; &amp;");
    const restored = new SvgReader(undefined, () => undefined).read(xml);
    expect(restored.width).toBe(document.width);
    expect(restored.height).toBe(document.height);
    expect(restored.viewBox).toEqual(document.viewBox);
    expect(restored.roots.map((shape) => shape.id)).toEqual(["group"]);
    expect((restored.getShape("group") as GroupShape).getChildren().map((shape) => shape.id)).toEqual(["rect", "text"]);
    expect(restored.getShape("rect").getAttributes()).toMatchObject({ x: 1.5, y: 2.5, width: 30, height: 40, fill: "#fff" });
    expect((restored.getShape("text") as TextShape).text).toBe("中文 < &");
  });

  it("converts missing and unwritable files to SvgIoError", async () => {
    const reader = new SvgReader();
    const writer = new SvgWriter();
    const document = new SvgDocument();
    await expect(reader.readFile("tests/fixtures/missing.svg")).rejects.toBeInstanceOf(SvgIoError);
    await expect(writer.writeFile(document, "tests")).rejects.toBeInstanceOf(SvgIoError);
  });
});