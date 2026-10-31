import { DomainError } from "../domain/DomainError.js";
import { SvgDocument } from "../domain/SvgDocument.js";
import { CommandInvoker } from "../application/CommandInvoker.js";

export class CliContext {
  private currentDocument: SvgDocument | null = null;
  private currentPath: string | undefined;

  public constructor(public readonly invoker = new CommandInvoker()) {}

  public get document(): SvgDocument | null {
    return this.currentDocument;
  }

  public get filePath(): string | undefined {
    return this.currentPath;
  }

  public setDocument(document: SvgDocument, filePath?: string): void {
    this.currentDocument = document;
    this.currentPath = filePath;
  }

  public requireDocument(): SvgDocument {
    if (this.currentDocument === null) {
      throw new DomainError("no document. use 'init' or 'read' first");
    }
    return this.currentDocument;
  }
}