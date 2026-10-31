import type { Command } from "./Command.js";
import { UndoManager } from "./UndoManager.js";

export class CommandInvoker {
  public constructor(public readonly undoManager: UndoManager = new UndoManager()) {}

  public executeEditing(command: Command): void {
    command.execute();
    this.undoManager.record(command);
  }

  public executeDisplay(command: Command): void {
    command.execute();
  }

  public markDocumentOperation(): void {
    this.undoManager.markDocumentOperation();
  }

  public undo(): void {
    this.undoManager.undo();
  }

  public redo(): void {
    this.undoManager.redo();
  }
}