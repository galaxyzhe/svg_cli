import { CommandLineParser } from "./CommandLineParser.js";
import { CliContext } from "./CliContext.js";
import { CommandRegistry } from "./CommandRegistry.js";

export class CliSession {
  public constructor(
    public readonly context = new CliContext(),
    private readonly parser = new CommandLineParser(),
    private readonly registry = new CommandRegistry(),
  ) {}

  public async executeLine(line: string): Promise<readonly string[]> {
    try {
      const parsed = this.parser.parse(line);
      if (parsed === undefined) return [];
      return await this.registry.execute(parsed.name, parsed.arguments, this.context);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return [`error: ${message}`];
    }
  }
}