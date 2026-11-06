import type { ApiErrorCode } from "@linkup/shared";

export class AppError extends Error {
  readonly code: ApiErrorCode;

  constructor(code: ApiErrorCode, message: string) {
    super(message);
    this.name = "AppError";
    this.code = code;
  }
}

export function fail(code: ApiErrorCode, message: string): never {
  throw new AppError(code, message);
}
