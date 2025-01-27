export class BaseError extends Error {
  constructor(message: string, public code: number, public type: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class HttpError extends BaseError {
  constructor(message: string, code: number) {
    super(message, code, 'ERROR_HTTP');
  }
}

export class GraphQLError extends BaseError {
  constructor(message: string) {
    super(message, 400, 'ERROR_GRAPHQL');
  }
}

export class ValidationError extends BaseError {
  constructor(message: string) {
    super(message, 400, 'ERROR_VALIDATION');
  }
}

export class NotFoundError extends BaseError {
  constructor(message: string) {
    super(message, 404, 'ERROR_NOT_FOUND');
  }
}

export class ParseError extends BaseError {
  constructor(message: string) {
    super(message, 500, 'ERROR_PARSE');
  }
}

export type ErrorType =
  | BaseError
  | Error
  | HttpError
  | NotFoundError
  | ValidationError
  | ParseError
  | GraphQLError;

export function handleError(error: ErrorType) {
  if (!(error instanceof Error)) {
    return {
      code: 500,
      error: {
        message: 'Unknown error occurred',
        type: `ERROR_UNKNOWN`,
      },
    };
  }

  switch (true) {
    case error instanceof HttpError:
      return {
        code: (error as HttpError).code,
        error: {
          message: error.message,
          type: 'ERROR_HTTP',
        },
      };

    case error instanceof GraphQLError:
      return {
        code: 400,
        error: {
          message: error.message,
          type: 'ERROR_GRAPHQL',
        },
      };

    case error instanceof ValidationError:
      return {
        code: 400,
        error: {
          message: error.message,
          type: 'ERROR_VALIDATION',
        },
      };

    case error instanceof NotFoundError:
      return {
        code: 404,
        error: {
          message: error.message,
          type: 'ERROR_NOT_FOUND',
        },
      };

    case error instanceof ParseError:
      return {
        code: 500,
        error: {
          message: error.message,
          type: 'ERROR_PARSE',
        },
      };

    case error instanceof BaseError:
      return {
        code: (error as BaseError).code,
        error: {
          message: error.message,
          type: (error as BaseError).type,
        },
      };

    default:
      return {
        code: 500,
        error: {
          message: error.message || 'Internal server error',
          type: 'ERROR_UNKNOWN',
        },
      };
  }
}
