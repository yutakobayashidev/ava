import { HTTPException } from "hono/http-exception";

export class InternalServerError extends HTTPException {
  constructor(message: string, cause?: unknown) {
    super(500, { message, cause });
    this.name = "ServiceError";
  }
}

export class ValidationError extends HTTPException {
  constructor(message: string, cause?: unknown) {
    super(400, { message, cause });
    this.name = "ValidationError";
  }
}
