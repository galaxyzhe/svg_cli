import { AddToCommand } from "../application/AddToCommand.js";
import { BackCommand } from "../application/BackCommand.js";
import { CreateCommand } from "../application/CreateCommand.js";
import { DeleteCommand } from "../application/DeleteCommand.js";
import { FrontCommand } from "../application/FrontCommand.js";
import { GroupCommand } from "../application/GroupCommand.js";
import { MoveCommand } from "../application/MoveCommand.js";
import { ScaleCommand } from "../application/ScaleCommand.js";
import { SetCommand } from "../application/SetCommand.js";
import { UngroupCommand } from "../application/UngroupCommand.js";
import { GroupShape } from "../domain/GroupShape.js";
import { ShapeFactory } from "../domain/ShapeFactory.js";
import { SvgDocument } from "../domain/SvgDocument.js";
import { SvgReader } from "../infrastructure/SvgReader.js";
import { SvgWriter } from "../infrastructure/SvgWriter.js";
import type { Shape } from "../domain/Shape.js";
import { CliContext } from "./CliContext.js";
import { CliError } from "./CliError.js";
import { OutputFormatter } from "./OutputFormatter.js";

type CommandHandler = (arguments_: readonly string[], context: CliContext) => Promise<readonly string[]>;

export class CommandRegistry {
  private readonly handlers: ReadonlyMap<string, CommandHandler>;

  public constructor(
    private readonly factory = new ShapeFactory(),
    private readonly formatter = new OutputFormatter(),
    private readonly writer = new SvgWriter(),
  ) {
    this.handlers = new Map([
      ["init", (args, context) => this.init(args, context)],
      ["read", (args, context) => this.read(args, context)],
      ["save", (args, context) => this.save(args, context)],
      ["canvas", (args, context) => this.canvas(args, context)],
      ["create", (args, context) => this.create(args, context)],
      ["delete", (args, context) => this.delete(args, context)],
      ["move", (args, context) => this.move(args, context)],
      ["scale", (args, context) => this.scale(args, context)],
      ["set", (args, context) => this.set(args, context)],
      ["group", (args, context) => this.group(args, context)],
      ["ungroup", (args, context) => this.ungroup(args, context)],
      ["addto", (args, context) => this.addto(args, context)],
      ["front", (args, context) => this.front(args, context)],
      ["back", (args, context) => this.back(args, context)],
      ["tree", (args, context) => this.tree(args, context)],
      ["show", (args, context) => this.show(args, context)],
      ["help", (args) => Promise.resolve(args.length === 0 ? [this.formatter.help()] : this.invalidArguments())],
      ["undo", (args, context) => this.undo(args, context)],
      ["redo", (args, context) => this.redo(args, context)],
    ]);
  }

  public execute(name: string, arguments_: readonly string[], context: CliContext): Promise<readonly string[]> {
    const handler = this.handlers.get(name);
    if (handler === undefined) throw new CliError(`unknown command: ${name}`);
    return handler(arguments_, context);
  }

  private async init(args: readonly string[], context: CliContext): Promise<readonly string[]> {
    this.expectCount(args, 0, 2);
    const width = args[0] === undefined ? 800 : this.number(args[0], "width");
    const height = args[1] === undefined ? 600 : this.number(args[1], "height");
    context.setDocument(new SvgDocument(width, height));
    context.invoker.markDocumentOperation();
    return [`canvas ${width}x${height} created`];
  }

  private async read(args: readonly string[], context: CliContext): Promise<readonly string[]> {
    this.expectCount(args, 1, 1);
    const messages: string[] = [];
    const document = await new SvgReader(this.factory, (message) => messages.push(message)).readFile(args[0]!);
    context.setDocument(document, args[0]);
    context.invoker.markDocumentOperation();
    return [...messages, `read ${args[0]} (${this.count(document)} elements)`];
  }

  private async save(args: readonly string[], context: CliContext): Promise<readonly string[]> {
    this.expectCount(args, 0, 1);
    const document = context.requireDocument();
    const filePath = args[0] ?? context.filePath;
    if (filePath === undefined) throw new CliError("no file path. use 'save <file.svg>'");
    await this.writer.writeFile(document, filePath);
    context.setDocument(document, filePath);
    context.invoker.markDocumentOperation();
    return [`saved to ${filePath} (${this.count(document)} elements)`];
  }

  private async canvas(args: readonly string[], context: CliContext): Promise<readonly string[]> {
    this.expectCount(args, 0, 2);
    const document = context.requireDocument();
    if (args.length === 0) return [`canvas ${document.width}x${document.height}`];
    if (args.length !== 2) throw new CliError("canvas expects [w] [h]");
    document.setCanvasSize(this.number(args[0]!, "width"), this.number(args[1]!, "height"));
    context.invoker.markDocumentOperation();
    return [`canvas ${document.width}x${document.height} updated`];
  }

  private async create(args: readonly string[], context: CliContext): Promise<readonly string[]> {
    const document = context.requireDocument();
    if (args.length < 2) throw new CliError("create expects <type> <id> [params...]");
    const type = args[0]!;
    const id = args[1]!;
    const inIndex = args.indexOf("in", 2);
    if (inIndex >= 0 && (inIndex !== args.length - 2 || args[inIndex + 1] === undefined)) {
      throw new CliError("create 'in' clause must be last");
    }
    const parentId = inIndex < 0 ? undefined : args[inIndex + 1];
    const parameters = args.slice(2, inIndex < 0 ? args.length : inIndex);
    const shape = this.factory.createFromParameters(type, id, parameters);
    const parent = parentId === undefined ? null : this.requireGroup(document, parentId);
    context.invoker.executeEditing(new CreateCommand(document, shape, parent));
    return [parent === null ? `${shape.describe()} created` : `${shape.describe()} created in ${parent.describe()}`];
  }

  private async delete(args: readonly string[], context: CliContext): Promise<readonly string[]> {
    this.expectCount(args, 1, 1);
    const document = context.requireDocument();
    const shape = document.getShape(args[0]!);
    context.invoker.executeEditing(new DeleteCommand(document, shape));
    return [`${shape.describe()} deleted`];
  }

  private async move(args: readonly string[], context: CliContext): Promise<readonly string[]> {
    this.expectCount(args, 3, 3);
    const shape = context.requireDocument().getShape(args[0]!);
    const deltaX = this.number(args[1]!, "dx");
    const deltaY = this.number(args[2]!, "dy");
    context.invoker.executeEditing(new MoveCommand(shape, deltaX, deltaY));
    return [`${shape.describe()} moved by (${deltaX},${deltaY})`];
  }

  private async scale(args: readonly string[], context: CliContext): Promise<readonly string[]> {
    this.expectCount(args, 2, 2);
    const shape = context.requireDocument().getShape(args[0]!);
    const factor = this.number(args[1]!, "factor");
    context.invoker.executeEditing(new ScaleCommand(shape, factor));
    return [`${shape.describe()} scaled by ${factor}`];
  }

  private async set(args: readonly string[], context: CliContext): Promise<readonly string[]> {
    this.expectCount(args, 3, 3);
    const shape = context.requireDocument().getShape(args[0]!);
    context.invoker.executeEditing(new SetCommand(shape, args[1]!, args[2]!));
    return [`${shape.describe()} updated: ${args[1]}=${args[2]}`];
  }

  private async group(args: readonly string[], context: CliContext): Promise<readonly string[]> {
    if (args.length < 2) throw new CliError("group expects <newGid> <id1> <id2>...");
    const document = context.requireDocument();
    const group = new GroupShape(args[0]!);
    const targets = args.slice(1).map((id) => document.getShape(id));
    context.invoker.executeEditing(new GroupCommand(document, group, targets));
    return [`${group.describe()} created with ${targets.length} children`];
  }

  private async ungroup(args: readonly string[], context: CliContext): Promise<readonly string[]> {
    this.expectCount(args, 1, 1);
    const document = context.requireDocument();
    const group = this.requireGroup(document, args[0]!);
    context.invoker.executeEditing(new UngroupCommand(document, group));
    return [`${group.describe()} ungrouped`];
  }

  private async addto(args: readonly string[], context: CliContext): Promise<readonly string[]> {
    this.expectCount(args, 2, 2);
    const document = context.requireDocument();
    const group = this.requireGroup(document, args[0]!);
    const shape = document.getShape(args[1]!);
    context.invoker.executeEditing(new AddToCommand(document, group, shape));
    return [`${shape.describe()} added to ${group.describe()}`];
  }

  private async front(args: readonly string[], context: CliContext): Promise<readonly string[]> {
    this.expectCount(args, 1, 1);
    const document = context.requireDocument();
    const shape = document.getShape(args[0]!);
    context.invoker.executeEditing(new FrontCommand(document, shape));
    return [`${shape.describe()} moved to front`];
  }

  private async back(args: readonly string[], context: CliContext): Promise<readonly string[]> {
    this.expectCount(args, 1, 1);
    const document = context.requireDocument();
    const shape = document.getShape(args[0]!);
    context.invoker.executeEditing(new BackCommand(document, shape));
    return [`${shape.describe()} moved to back`];
  }

  private async tree(args: readonly string[], context: CliContext): Promise<readonly string[]> {
    this.expectCount(args, 0, 1);
    const document = context.requireDocument();
    const root = args[0] === undefined ? undefined : document.getShape(args[0]);
    return [this.formatter.tree(document, root)];
  }

  private async show(args: readonly string[], context: CliContext): Promise<readonly string[]> {
    this.expectCount(args, 1, 1);
    return [this.formatter.show(context.requireDocument().getShape(args[0]!))];
  }

  private async undo(args: readonly string[], context: CliContext): Promise<readonly string[]> {
    this.expectCount(args, 0, 0);
    context.invoker.undo();
    return ["undone"];
  }

  private async redo(args: readonly string[], context: CliContext): Promise<readonly string[]> {
    this.expectCount(args, 0, 0);
    context.invoker.redo();
    return ["redone"];
  }

  private requireGroup(document: SvgDocument, id: string): GroupShape {
    const shape = document.getShape(id);
    if (!(shape instanceof GroupShape)) throw new CliError(`not a container: ${id}`);
    return shape;
  }

  private number(value: string, name: string): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) throw new CliError(`invalid ${name}: ${value}`);
    return parsed;
  }

  private expectCount(args: readonly string[], minimum: number, maximum: number): void {
    if (args.length < minimum || args.length > maximum) throw new CliError("invalid command arguments");
  }

  private invalidArguments(): readonly string[] {
    throw new CliError("help takes no arguments");
  }

  private count(document: SvgDocument): number {
    const count = (shape: Shape): number =>
      1 + shape.getChildren().reduce((total, child) => total + count(child), 0);
    return document.roots.reduce((total, shape) => total + count(shape), 0);
  }
}