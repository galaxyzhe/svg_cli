export class ShapeTreeToken {
  private constructor() {}

  public static create(): ShapeTreeToken {
    return new ShapeTreeToken();
  }
}

export const documentTreeToken = ShapeTreeToken.create();