import { DomainError } from "../domain/DomainError.js";
import type { Command } from "./Command.js";

export class UndoManager {
  private readonly undoStack: Command[] = [];
  private readonly redoStack: Command[] = [];
  private historyLocked = false;

  public record(command: Command): void {
    this.undoStack.push(command);
    this.redoStack.length = 0;
    this.historyLocked = false;
  }

  public undo(): void {
    this.assertHistoryAvailable();
    const command = this.undoStack.pop();
    if (!command) throw new DomainError("nothing to undo");
    try {
      command.undo();
      this.redoStack.push(command);
    } catch (error) {
      this.undoStack.push(command);
      throw error;
    }
  }

  public redo(): void {
    this.assertHistoryAvailable();
    const command = this.redoStack.pop();
    if (!command) throw new DomainError("nothing to redo");
    try {
      command.execute();
      this.undoStack.push(command);
    } catch (error) {
      this.redoStack.push(command);
      throw error;
    }
  }

  public markDocumentOperation(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
    this.historyLocked = true;
  }

  public get canUndo(): boolean {
    return !this.historyLocked && this.undoStack.length > 0;
  }

  public get canRedo(): boolean {
    return !this.historyLocked && this.redoStack.length > 0;
  }

  private assertHistoryAvailable(): void {
    if (this.historyLocked) throw new DomainError("undo not allowed after io command");
  }
}