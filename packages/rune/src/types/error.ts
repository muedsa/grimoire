export enum ErrorCode {
  NODE_TYPE_ERROR = "NODE_TYPE_ERROR",
  EXPRESSION_ERROR = "EXPRESSION_ERROR",
  CUSTOM_NODE_NOT_FOUND = "CUSTOM_NODE_NOT_FOUND",
  EXECUTE_ERROR = "EXECUTE_ERROR",
}

export class EngineError extends Error {
  code: ErrorCode;
  cause?: unknown;

  constructor(code: ErrorCode, message: string, cause?: unknown) {
    super(message);
    this.code = code;
    this.cause = cause;
  }
}
