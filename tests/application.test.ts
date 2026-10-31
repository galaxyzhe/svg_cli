import { describe, expect, it } from "vitest";
import { AbstractCommand } from "../src/application/AbstractCommand.js";
import { AddToCommand } from "../src/application/AddToCommand.js";
import { BackCommand } from "../src/application/BackCommand.js";
import { CommandInvoker } from "../src/application/CommandInvoker.js";
import { CreateCommand } from "../src/application/CreateCommand.js";
import { DeleteCommand } from "../src/application/DeleteCommand.js";
import { DomainError } from "../src/domain/DomainError.js";
import { FrontCommand } from "../src/application/FrontCommand.js";
import { GroupCommand } from "../src/application/GroupCommand.js";
import { MoveCommand } from "../src/application/MoveCommand.js";
import { ScaleCommand } from "../src/application/ScaleCommand.js";
import { SetCommand } from "../src/application/SetCommand.js";
import { UngroupCommand } from "../src/application/UngroupCommand.js";
import { CircleShape } from "../src/domain/CircleShape.js";
import { GroupShape } from "../src/domain/GroupShape.js";
import { RectShape } from "../src/domain/RectShape.js";
import { SvgDocument } from "../src/domain/SvgDocument.js";
import { TextShape } from "../src/domain/TextShape.js";

class DisplayCommand extends AbstractCommand {
  public constructor(private readonly output: string[], private readonly value: string) {
    super();
  }

  protected executeInternal(): void {
    this.output.push(this.value);
  }

  protected undoInternal(): void {
    this.output.pop();
  }
}

describe("basic editing commands", () => {
  it("supports move, scale, undo and redo as individual units", () => {
    const document = new SvgDocument();
    const rect = new RectShape("rect", 1, 2, 3, 4);
    document.addShape(rect);
    const invoker = new CommandInvoker();

    invoker.executeEditing(new MoveCommand(rect, 10, 20));
    expect(rect.getAttributes()).toMatchObject({ x: 11, y: 22 });
    invoker.undo();
    expect(rect.getAttributes()).toMatchObject({ x: 1, y: 2 });
    invoker.redo();
    expect(rect.getAttributes()).toMatchObject({ x: 11, y: 22 });

    invoker.executeEditing(new ScaleCommand(rect, 2));
    expect(rect.getAttributes()).toMatchObject({ x: 22, y: 44, width: 6, height: 8 });
    invoker.undo();
    expect(rect.getAttributes()).toMatchObject({ x: 11, y: 22, width: 3, height: 4 });
  });

  it("restores set values, including text and absent style attributes", () => {
    const document = new SvgDocument();
    const text = new TextShape("text", 1, 2, "old");
    document.addShape(text);
    const invoker = new CommandInvoker();

    invoker.executeEditing(new SetCommand(text, "text", "new"));
    expect(text.text).toBe("new");
    invoker.undo();
    expect(text.text).toBe("old");
    invoker.redo();
    expect(text.text).toBe("new");

    const fillCommand = new SetCommand(text, "fill", "red");
    invoker.executeEditing(fillCommand);
    invoker.undo();
    expect(text.getAttribute("fill")).toBeUndefined();
  });

  it("creates, undoes and redoes a shape", () => {
    const document = new SvgDocument();
    const circle = new CircleShape("circle", 1, 2, 3);
    const invoker = new CommandInvoker();
    invoker.executeEditing(new CreateCommand(document, circle));
    expect(document.findShape("circle")).toBe(circle);
    invoker.undo();
    expect(document.findShape("circle")).toBeUndefined();
    invoker.redo();
    expect(document.findShape("circle")).toBe(circle);
  });
});

describe("structure commands", () => {
  it("deletes a container and restores its complete subtree and order", () => {
    const document = new SvgDocument();
    const group = new GroupShape("group");
    const first = new RectShape("first", 0, 0, 1, 1);
    const second = new CircleShape("second", 0, 0, 1);
    group.addChild(first);
    group.addChild(second);
    document.addShape(group);
    const invoker = new CommandInvoker();

    invoker.executeEditing(new DeleteCommand(document, group));
    expect(document.findShape("group")).toBeUndefined();
    expect(document.findShape("first")).toBeUndefined();
    invoker.undo();
    expect(document.findShape("first")).toBe(first);
    expect(group.getChildren().map((shape) => shape.id)).toEqual(["first", "second"]);
    invoker.redo();
    expect(document.findShape("second")).toBeUndefined();
  });

  it("groups targets from different parents and restores every original placement", () => {
    const document = new SvgDocument();
    const firstParent = new GroupShape("first-parent");
    const secondParent = new GroupShape("second-parent");
    const first = new RectShape("first", 0, 0, 1, 1);
    const second = new CircleShape("second", 0, 0, 1);
    firstParent.addChild(first);
    secondParent.addChild(second);
    document.addShape(firstParent);
    document.addShape(secondParent);
    const group = new GroupShape("group");
    const invoker = new CommandInvoker();

    invoker.executeEditing(new GroupCommand(document, group, [first, second]));
    expect(first.parent).toBe(group);
    expect(second.parent).toBe(group);
    invoker.undo();
    expect(first.parent).toBe(firstParent);
    expect(second.parent).toBe(secondParent);
    expect(firstParent.getChildren().map((shape) => shape.id)).toEqual(["first"]);
    expect(secondParent.getChildren().map((shape) => shape.id)).toEqual(["second"]);
    invoker.redo();
    expect(group.getChildren().map((shape) => shape.id)).toEqual(["first", "second"]);
  });

  it("ungroups into the original position and restores the group on undo", () => {
    const document = new SvgDocument();
    const parent = new GroupShape("parent");
    const before = new RectShape("before", 0, 0, 1, 1);
    const group = new GroupShape("group");
    const child = new CircleShape("child", 0, 0, 1);
    const after = new RectShape("after", 0, 0, 1, 1);
    group.addChild(child);
    parent.addChild(before);
    parent.addChild(group);
    parent.addChild(after);
    document.addShape(parent);
    const invoker = new CommandInvoker();

    invoker.executeEditing(new UngroupCommand(document, group));
    expect(parent.getChildren().map((shape) => shape.id)).toEqual(["before", "child", "after"]);
    invoker.undo();
    expect(parent.getChildren().map((shape) => shape.id)).toEqual(["before", "group", "after"]);
    expect(group.getChildren().map((shape) => shape.id)).toEqual(["child"]);
  });

  it("supports addto, front and back with undo", () => {
    const document = new SvgDocument();
    const parent = new GroupShape("parent");
    const target = new RectShape("target", 0, 0, 1, 1);
    const other = new CircleShape("other", 0, 0, 1);
    document.addShape(parent);
    document.addShape(target);
    document.addShape(other);
    const invoker = new CommandInvoker();

    invoker.executeEditing(new AddToCommand(document, parent, target));
    expect(parent.getChildren().map((shape) => shape.id)).toEqual(["target"]);
    invoker.undo();
    expect(document.roots.map((shape) => shape.id)).toEqual(["parent", "target", "other"]);

    invoker.executeEditing(new FrontCommand(document, target));
    expect(document.roots.map((shape) => shape.id)).toEqual(["parent", "other", "target"]);
    invoker.undo();
    invoker.executeEditing(new BackCommand(document, other));
    expect(document.roots.map((shape) => shape.id)).toEqual(["other", "parent", "target"]);
  });
});

describe("history state", () => {
  it("clears redo after a new edit and excludes display commands", () => {
    const document = new SvgDocument();
    const rect = new RectShape("rect", 0, 0, 1, 1);
    document.addShape(rect);
    const invoker = new CommandInvoker();
    invoker.executeEditing(new MoveCommand(rect, 1, 0));
    invoker.undo();
    invoker.executeEditing(new MoveCommand(rect, 2, 0));
    expect(() => invoker.redo()).toThrow("nothing to redo");

    const output: string[] = [];
    invoker.executeDisplay(new DisplayCommand(output, "tree"));
    expect(output).toEqual(["tree"]);
    invoker.undo();
    expect(rect.getAttributes()).toMatchObject({ x: 0 });
  });

  it("locks history after document operations and unlocks after a new edit", () => {
    const document = new SvgDocument();
    const rect = new RectShape("rect", 0, 0, 1, 1);
    document.addShape(rect);
    const invoker = new CommandInvoker();
    invoker.executeEditing(new MoveCommand(rect, 1, 0));
    invoker.markDocumentOperation();
    expect(() => invoker.undo()).toThrow("undo not allowed after io command");
    expect(() => invoker.redo()).toThrow("undo not allowed after io command");

    invoker.executeEditing(new MoveCommand(rect, 2, 0));
    invoker.undo();
    expect(rect.getAttributes()).toMatchObject({ x: 1 });
  });

  it("does not record a failed command or partially modify the document", () => {
    const document = new SvgDocument();
    const rect = new RectShape("rect", 0, 0, 1, 1);
    const group = new GroupShape("group");
    document.addShape(rect);
    document.addShape(group);
    const invoker = new CommandInvoker();

    expect(() => invoker.executeEditing(new SetCommand(rect, "text", "invalid"))).toThrow("unknown attribute");
    expect(rect.getAttributes()).toMatchObject({ x: 0, y: 0, width: 1, height: 1 });
    expect(() => invoker.undo()).toThrow("nothing to undo");
    expect(() => invoker.executeEditing(new AddToCommand(document, group, group))).toThrow(DomainError);
    expect(group.parent).toBeNull();
    expect(document.roots.map((shape) => shape.id)).toEqual(["rect", "group"]);
  });
});