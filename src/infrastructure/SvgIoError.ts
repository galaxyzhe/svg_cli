export class SvgIoError extends Error {
  public constructor(message: string, public override readonly cause?: unknown) {
    super(message);
    this.name = "SvgIoError";
  }
}