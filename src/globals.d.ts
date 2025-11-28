import type { Schema } from "../env";

declare global {
  namespace NodeJS {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface ProcessEnv extends Schema { }
  }

  type PartialWithNullable<T> = {
    [P in keyof T]?: T[P] | null;
  };
}

export { };
