/**
 * Error codes as defined in shared-contracts spec
 */
export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  INVALID_STATE_TRANSITION = 'INVALID_STATE_TRANSITION',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export interface ErrorDetail {
  field: string;
  message: string;
}

export interface FormattedError {
  error: {
    code: ErrorCode;
    message: string;
    details?: ErrorDetail[];
  };
}

/**
 * Formats an error according to RFC 7807 structure
 * @param code - Error code from ErrorCode enum
 * @param message - Human-readable error message
 * @param details - Optional array of field-level error details
 * @returns Formatted error object
 */
export function formatError(
  code: ErrorCode,
  message: string,
  details?: ErrorDetail[]
): FormattedError {
  const formatted: FormattedError = {
    error: {
      code,
      message,
    },
  };

  if (details && details.length > 0) {
    formatted.error.details = details;
  }

  return formatted;
}

export interface AppError extends Error {
  statusCode: number;
  code: ErrorCode;
  details?: ErrorDetail[];
}

/**
 * Creates an application error with status code and error code
 * @param code - Error code from ErrorCode enum
 * @param message - Human-readable error message
 * @param statusCode - HTTP status code
 * @param details - Optional array of field-level error details
 * @returns AppError instance
 */
export function createAppError(
  code: ErrorCode,
  message: string,
  statusCode: number,
  details?: ErrorDetail[]
): AppError {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.code = code;
  if (details) {
    error.details = details;
  }
  return error;
}

/**
 * HTTP status codes mapped to error codes
 */
export const errorCodeToStatus: Record<ErrorCode, number> = {
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.INVALID_STATE_TRANSITION]: 409,
  [ErrorCode.SERVICE_UNAVAILABLE]: 503,
  [ErrorCode.INTERNAL_ERROR]: 500,
};