import { readFile } from "node:fs/promises";
import { XMLParser } from "fast-xml-parser";
import { DomainError } from "../domain/DomainError.js";
import { GroupShape } from "../domain/GroupShape.js";
import { ShapeFactory } from "../domain/ShapeFactory.js";
import { SvgDocument, type SvgViewBox } from "../domain/SvgDocument.js";
import type { Shape } from "../domain/Shape.js";
import { SvgIoError } from "./SvgIoError.js";

interface XmlElement {
  readonly name: string;
  readonly attributes: Readonly<Record<string, string>>;
  readonly children: readonly unknown[];
}

export type WarningSink = (message: string) => void;

export class SvgReader {
  private readonly parser = new XMLParser({
    preserveOrder: true,
    ignoreAttributes: false,
    attributeNamePrefix: "@",
    textNodeName: "#text",
    trimValues: false,
    processEntities: true,
    parseTagValue: false,
    parseAttributeValue: false,
  });
  private readonly idCounters = new Map<string, number>();

  public constructor(
    private readonly factory = new ShapeFactory(),
    private readonly warningSink: WarningSink = (message) => process.stderr.write(`${message}\n`),
  ) {}

  public async readFile(filePath: string): Promise<SvgDocument> {
    let xml: string;
    try {
      xml = await readFile(filePath, "utf8");
    } catch (error) {
      throw new SvgIoError(`cannot read file: ${filePath}`, error);
    }
    return this.read(xml);
  }

  public read(xml: string): SvgDocument {
    this.idCounters.clear();
    let parsed: unknown;
    try {
      parsed = this.parser.parse(xml);
    } catch (error) {
      throw new SvgIoError("invalid SVG XML", error);
    }
    const root = this.findFirstElement(parsed);
    if (root === null || root.name !== "svg") throw new SvgIoError("invalid SVG root element");

    const viewBox = this.readViewBox(root.attributes.viewBox);
    const width = this.readCanvasValue(root.attributes.width, viewBox?.width ?? 800, "width");
    const height = this.readCanvasValue(root.attributes.height, viewBox?.height ?? 600, "height");
    const document = new SvgDocument(width, height, viewBox ?? { minX: 0, minY: 0, width, height });
    for (const child of root.children) {
      if (this.isWhitespaceText(child)) continue;
      const element = this.toElement(child);
      if (element !== null) this.readShape(element, document, null);
    }
    return document;
  }

  private readShape(element: XmlElement, document: SvgDocument, parent: GroupShape | null): Shape | undefined {
    const id = element.attributes.id ?? this.assignId(element.name, document);
    const attributes = this.shapeAttributes(element.attributes);
    const text = this.textContent(element.children);
    const shape = this.factory.create(element.name, id, attributes, text);
    if (!(shape instanceof GroupShape)) this.rejectNestedElements(element.children);
    document.addShapeAt(shape, parent, parent === null ? document.roots.length : parent.getChildren().length);
    if (shape instanceof GroupShape) {
      for (const child of element.children) {
        if (this.isWhitespaceText(child)) continue;
        const childElement = this.toElement(child);
        if (childElement !== null) this.readShape(childElement, document, shape);
      }
    }
    return shape;
  }

  private shapeAttributes(attributes: Readonly<Record<string, string>>): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [name, value] of Object.entries(attributes)) {
      if (name !== "id" && name !== "xmlns" && name !== "viewBox" && !name.startsWith("xmlns:")) {
        result[name] = value;
      }
    }
    return result;
  }

  private assignId(tagName: string, document: SvgDocument): string {
    let counter = (this.idCounters.get(tagName) ?? 0) + 1;
    let id = `${tagName}${counter}`;
    while (document.findShape(id) !== undefined) {
      counter += 1;
      id = `${tagName}${counter}`;
    }
    this.idCounters.set(tagName, counter);
    this.warningSink(`warning: assigned id ${id} to unnamed <${tagName}>`);
    return id;
  }

  private findFirstElement(parsed: unknown): XmlElement | null {
    if (!Array.isArray(parsed)) return null;
    for (const node of parsed) {
      const element = this.toElement(node);
      if (element !== null && !element.name.startsWith("?")) return element;
    }
    return null;
  }

  private toElement(value: unknown): XmlElement | null {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
    const node = value as Record<string, unknown>;
    const entries = Object.entries(node);
    const elementEntry = entries.find(([name]) => name !== ":@");
    if (elementEntry === undefined || !Array.isArray(elementEntry[1])) return null;
    const rawAttributes = node[":@"];
    const attributes: Record<string, string> = {};
    if (typeof rawAttributes === "object" && rawAttributes !== null && !Array.isArray(rawAttributes)) {
      for (const [name, attributeValue] of Object.entries(rawAttributes)) {
        if (typeof attributeValue === "string" && name.startsWith("@")) attributes[name.slice(1)] = attributeValue;
      }
    }
    return { name: elementEntry[0], attributes, children: elementEntry[1] };
  }

  private textContent(children: readonly unknown[]): string {
    return children
      .filter((child): child is Record<string, unknown> => typeof child === "object" && child !== null && !Array.isArray(child))
      .filter((child) => typeof child["#text"] === "string")
      .map((child) => child["#text"] as string)
      .join("");
  }

  private rejectNestedElements(children: readonly unknown[]): void {
    for (const child of children) {
      const element = this.toElement(child);
      if (element !== null) throw new DomainError(`unknown shape type: ${element.name}`);
    }
  }

  private readViewBox(value: string | undefined): SvgViewBox | undefined {
    if (value === undefined) return undefined;
    const values = value.trim().split(/[\s,]+/).map(Number);
    if (values.length !== 4 || values.some((number) => !Number.isFinite(number))) {
      throw new DomainError("invalid viewBox");
    }
    const [minX, minY, width, height] = values;
    if (minX === undefined || minY === undefined || width === undefined || height === undefined) {
      throw new DomainError("invalid viewBox");
    }
    return { minX, minY, width, height };
  }

  private readCanvasValue(value: string | undefined, fallback: number, name: string): number {
    if (value === undefined) return fallback;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) throw new DomainError(`invalid ${name}`);
    return parsed;
  }

  private isWhitespaceText(value: unknown): boolean {
    return typeof value === "object" && value !== null && !Array.isArray(value) &&
      typeof (value as Record<string, unknown>)["#text"] === "string" &&
      ((value as Record<string, unknown>)["#text"] as string).trim() === "";
  }

}