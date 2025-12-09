import { HTTPException } from "hono/http-exception";

/**
 * 500 Internal Server Error
 */
export class InternalServerError extends HTTPException {
  constructor(message: string, cause?: unknown) {
    super(500, { message, cause });
    this.name = "InternalServerError";
  }
}

/**
 * 400 Bad Request - クライアントのリクエストが不正
 * バリデーションエラー、ビジネスルール違反など
 */
export class BadRequestError extends HTTPException {
  constructor(message: string, cause?: unknown) {
    super(400, { message, cause });
    this.name = "BadRequestError";
  }
}

/**
 * 402 Payment Required - 支払いが必要
 * プラン制限など
 */
export class PaymentRequiredError extends HTTPException {
  constructor(message: string, cause?: unknown) {
    super(402, { message, cause });
    this.name = "PaymentRequiredError";
  }
}

/**
 * 404 Not Found - リソースが見つからない
 */
export class NotFoundError extends HTTPException {
  constructor(message: string, cause?: unknown) {
    super(404, { message, cause });
    this.name = "NotFoundError";
  }
}
