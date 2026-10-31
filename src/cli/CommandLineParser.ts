import { CliError } from "./CliError.js";

export interface ParsedCommandLine {
  readonly name: string;
  readonly arguments: readonly string[];
}

export class CommandLineParser {
  public parse(line: string): ParsedCommandLine | undefined {
    const source = line.trim();
    if (source.length === 0 || source.startsWith("#")) return undefined;

    const tokens: string[] = [];
    let token = "";
    let quoted = false;
    let escaping = false;
    let tokenStarted = false;
    for (const character of source) {
      if (escaping) {
        token += character === '"' || character === "\\" ? character : `\\${character}`;
        escaping = false;
        tokenStarted = true;
      } else if (character === "\\") {
        escaping = true;
        tokenStarted = true;
      } else if (character === '"') {
        quoted = !quoted;
        tokenStarted = true;
      } else if (/\s/.test(character) && !quoted) {
        if (tokenStarted) {
          tokens.push(token);
          token = "";
          tokenStarted = false;
        }
      } else {
        token += character;
        tokenStarted = true;
      }
    }
    if (escaping) token += "\\";
    if (quoted) throw new CliError("unterminated quoted argument");
    if (tokenStarted) tokens.push(token);
    const name = tokens.shift();
    if (name === undefined) return undefined;
    return { name, arguments: tokens };
  }
}