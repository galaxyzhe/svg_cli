import { DomainError } from "../domain/DomainError.js";
import type { Command } from "./Command.js";

type CommandState = "ready" | "done" | "undone";

export abstract class AbstractCommand implements Command {
  private state: CommandState = "ready";

  public execute(): void {
    if (this.state === "done") throw new DomainError("command is already executed");
    this.executeInternal();
    this.state = "done";
  }

  public undo(): void {
    if (this.state !== "done") throw new DomainError("command cannot be undone");
    this.undoInternal();
    this.state = "undone";
  }

  protected abstract executeInternal(): void;

  protected abstract undoInternal(): void;
}