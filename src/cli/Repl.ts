import { createInterface } from "node:readline";
import { stdin, stdout } from "node:process";
import { CliSession } from "./CliSession.js";

export class Repl {
  public constructor(private readonly session = new CliSession()) {}

  public async run(): Promise<void> {
    stdout.write("svg-editor 0.1 — type 'help' for commands\n");
    stdout.write("svg> ");
    const lines = createInterface({ input: stdin, crlfDelay: Infinity });
    for await (const line of lines) {
      if (line.trim() === "exit" || line.trim() === "quit") break;
      const output = await this.session.executeLine(line);
      for (const message of output) stdout.write(`${message}\n`);
      stdout.write("svg> ");
    }
    lines.close();
  }
}