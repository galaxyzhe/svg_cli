import { copyFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CliSession } from "../src/cli/CliSession.js";

const execute = (session: CliSession, line: string) => session.executeLine(line);

describe("phase acceptance: documents and canvas", () => {
  it("supports init sizes, read replacement, path tracking and default save", async () => {
    const directory = await mkdtemp(join(tmpdir(), "svg-cli-"));
    const source = join(directory, "source.svg");
    await copyFile("tests/fixtures/other.svg", source);
    const session = new CliSession();

    expect(await execute(session, "init")).toEqual(["canvas 800x600 created"]);
    expect(await execute(session, "canvas")).toEqual(["canvas 800x600"]);
    expect(await execute(session, "init 320 240")).toEqual(["canvas 320x240 created"]);
    expect(await execute(session, "canvas")).toEqual(["canvas 320x240"]);
    const readOutput = await execute(session, `read "${source}"`);
    expect(readOutput[0]).toBe("warning: assigned id rect1 to unnamed <rect>");
    expect(readOutput[1]).toBe(`read ${source} (7 elements)`);
    expect((await execute(session, "tree"))[0]).toContain("svg (400x300)");
    expect((await execute(session, "save"))[0]).toBe(`saved to ${source} (7 elements)`);
  });

  it("keeps the current document when read fails", async () => {
    const session = new CliSession();
    await execute(session, "init 123 456");

    expect(await execute(session, "read tests/fixtures/missing.svg")).toEqual([
      "error: cannot read file: tests/fixtures/missing.svg",
    ]);
    expect((await execute(session, "canvas"))[0]).toBe("canvas 123x456");
  });

  it("locks history after document operations and canvas changes", async () => {
    const directory = await mkdtemp(join(tmpdir(), "svg-cli-"));
    const output = join(directory, "canvas.svg");
    const session = new CliSession();
    await execute(session, "init");
    await execute(session, "create rect r 0 0 1 1");
    expect((await execute(session, `save "${output}"`))[0]).toContain("saved to");
    expect(await execute(session, "undo")).toEqual(["error: undo not allowed after io command"]);
    expect(await execute(session, "canvas 100 200")).toEqual(["canvas 100x200 updated"]);
    expect(await execute(session, "redo")).toEqual(["error: undo not allowed after io command"]);
    await execute(session, "create circle c 1 1 1");
    expect(await execute(session, "undo")).toEqual(["undone"]);
  });
});

describe("phase acceptance: create and set", () => {
  it("accepts all create parameter orders and omits optional styles", async () => {
    const session = new CliSession();
    await execute(session, "init");
    expect(await execute(session, "create rect r 1 2 3 4")).toEqual(["rect#r created"]);
    expect(await execute(session, "create circle c 1 2 3 red")).toEqual(["circle#c created"]);
    expect(await execute(session, "create ellipse e 1 2 3 4 blue")).toEqual(["ellipse#e created"]);
    expect(await execute(session, "create line l 1 2 3 4 black")).toEqual(["line#l created"]);
    expect(await execute(session, 'create text t 1 2 "hello world"')).toEqual(["text#t created"]);
    expect(await execute(session, "create g g")).toEqual(["g#g created"]);
    const rectangle = await execute(session, "show r");
    expect(rectangle[0]).not.toContain("fill=");
    expect((await execute(session, "show l"))[0]).toContain("stroke=black");
    expect((await execute(session, "show t"))[0]).toContain("text=\"hello world\"");
  });

  it("enforces set whitelist and supports each geometry family", async () => {
    const session = new CliSession();
    await execute(session, "init");
    await execute(session, "create rect r 1 2 3 4");
    await execute(session, "create circle c 1 2 3");
    await execute(session, "create ellipse e 1 2 3 4");
    await execute(session, "create line l 1 2 3 4");
    await execute(session, 'create text t 1 2 "old"');
    expect(await execute(session, "set r width 5")).toEqual(["rect#r updated: width=5"]);
    expect(await execute(session, "set c r 6")).toEqual(["circle#c updated: r=6"]);
    expect(await execute(session, "set e rx 7")).toEqual(["ellipse#e updated: rx=7"]);
    expect(await execute(session, "set l x2 8")).toEqual(["line#l updated: x2=8"]);
    expect(await execute(session, 'set t text "new value"')).toEqual(["text#t updated: text=new value"]);
    expect(await execute(session, "set r unknown value")).toEqual(["error: unknown attribute: unknown"]);
  });
});

describe("phase acceptance: error table", () => {
  it("reports the required errors with error prefix", async () => {
    const session = new CliSession();
    expect(await execute(session, "move missing 1 1")).toEqual(["error: no document. use 'init' or 'read' first"]);
    expect(await execute(session, "undo")).toEqual(["error: no document. use 'init' or 'read' first"]);
    expect(await execute(session, "redo")).toEqual(["error: no document. use 'init' or 'read' first"]);
    await execute(session, "init");
    await execute(session, "create rect r 0 0 1 1");
    await execute(session, "create g g");
    expect(await execute(session, "create rect r 0 0 1 1")).toEqual(["error: id already exists: r"]);
    expect(await execute(session, "move missing 1 1")).toEqual(["error: no such shape: missing"]);
    expect(await execute(session, "create rect x 0 0 1 1 in missing")).toEqual(["error: no such container: missing"]);
    expect(await execute(session, "create rect x 0 0 1 1 in r")).toEqual(["error: not a container: r"]);
    expect(await execute(session, "create box b 0 0 1 1 title")).toEqual(["error: unknown shape type: box"]);
    expect(await execute(session, "scale r 0")).toEqual(["error: scale factor must be positive"]);
    expect(await execute(session, "ungroup g")).toEqual(["error: cannot ungroup top-level container: g"]);
    expect(await execute(session, "read tests/fixtures/missing.svg")).toEqual(["error: cannot read file: tests/fixtures/missing.svg"]);
    expect(await execute(session, "save tests")).toEqual(["error: cannot write file: tests"]);
  });

  it("allows the text content to be the word in", async () => {
    const session = new CliSession();
    await execute(session, "init");
    expect(await execute(session, 'create text t 0 0 "in"')).toEqual(["text#t created"]);
    expect((await execute(session, "show t"))[0]).toContain("text=\"in\"");
  });
});