import { describe, expect, it } from "vitest";
import { CliSession } from "../src/cli/CliSession.js";

async function run(session: CliSession, line: string): Promise<readonly string[]> {
  return session.executeLine(line);
}

describe("CLI session", () => {
  it("replays the core editing workflow with quoted text and composite operations", async () => {
    const session = new CliSession();
    expect(await run(session, "")).toEqual([]);
    expect(await run(session, "# script comment")).toEqual([]);
    expect(await run(session, "init 800 600")).toEqual(["canvas 800x600 created"]);
    expect(await run(session, 'create g flowchart')).toEqual(["g#flowchart created"]);
    expect(await run(session, 'create rect start 120 100 160 60 #4a90d9 in flowchart')).toEqual(["rect#start created in g#flowchart"]);
    expect(await run(session, 'create text label 155 135 "开始 节点" in flowchart')).toEqual(["text#label created in g#flowchart"]);
    expect(await run(session, "tree")).toEqual([
      "svg (800x600)\n" +
      "└── g#flowchart\n" +
      "    ├── rect#start  x=120 y=100 width=160 height=60 fill=#4a90d9\n" +
      "    └── text#label (155,135) \"开始 节点\"",
    ]);
    expect(await run(session, "move flowchart 0 100")).toEqual(["g#flowchart moved by (0,100)"]);
    expect(await run(session, "undo")).toEqual(["undone"]);
    expect(await run(session, "redo")).toEqual(["redone"]);
    expect(await run(session, 'set label text "新 文本"')).toEqual(["text#label updated: text=新 文本"]);
    expect(await run(session, "group bad flowchart start")).toEqual([
      "error: cannot group a container into its own descendant",
    ]);
  });

  it("uses error-prefixed responses and keeps failed commands state-neutral", async () => {
    const session = new CliSession();
    expect(await run(session, "tree")).toEqual(["error: no document. use 'init' or 'read' first"]);
    expect(await run(session, "init")).toEqual(["canvas 800x600 created"]);
    expect(await run(session, "create box bad 0 0 1 1 title")).toEqual(["error: unknown shape type: box"]);
    expect(await run(session, "tree")).toEqual(["svg (800x600)"]);
    expect(await run(session, "create rect r 0 0 1 1")).toEqual(["rect#r created"]);
    expect(await run(session, "move r nope 1")).toEqual(["error: invalid dx: nope"]);
    expect(await run(session, "show r")).toContain("rect#r  parent=svg\n  x=0\n  y=0\n  width=1\n  height=1");
  });

  it("supports create in, addto, z-order, canvas and help", async () => {
    const session = new CliSession();
    await run(session, "init");
    expect(await run(session, "create g one")).toEqual(["g#one created"]);
    expect(await run(session, "create rect a 0 0 1 1")).toEqual(["rect#a created"]);
    expect(await run(session, "addto one a")).toEqual(["rect#a added to g#one"]);
    expect(await run(session, "create rect b 0 0 1 1")).toEqual(["rect#b created"]);
    expect(await run(session, "front one")).toEqual(["g#one moved to front"]);
    expect(await run(session, "back one")).toEqual(["g#one moved to back"]);
    expect(await run(session, "canvas")).toEqual(["canvas 800x600"]);
    expect(await run(session, "canvas 400 300")).toEqual(["canvas 400x300 updated"]);
    expect((await run(session, "help"))[0]).toContain("exit / quit");
  });
});