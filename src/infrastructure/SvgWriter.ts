import { writeFile } from "node:fs/promises";
import type { SvgDocument } from "../domain/SvgDocument.js";
import { SvgIoError } from "./SvgIoError.js";

export class SvgWriter {
  public async writeFile(document: SvgDocument, filePath: string): Promise<void> {
    try {
      await writeFile(filePath, this.write(document), "utf8");
    } catch (error) {
      throw new SvgIoError(`cannot write file: ${filePath}`, error);
    }
  }

  public write(document: SvgDocument): string {
    const { minX, minY, width, height } = document.viewBox;
    const viewBox = `${minX} ${minY} ${width} ${height}`;
    const children = document.roots.map((shape) => shape.toSvg()).join("");
    return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${this.escape(String(document.width))}" height="${this.escape(String(document.height))}" viewBox="${this.escape(viewBox)}">${children}</svg>\n`;
  }

  private escape(value: string): string {
    return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  }
}