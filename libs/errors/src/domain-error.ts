export abstract class DomainError extends Error {
  abstract readonly code: string;

  constructor(message?: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

export abstract class NotFoundError extends DomainError {}

export abstract class ConflictError extends DomainError {}

export abstract class ForbiddenError extends DomainError {}

export abstract class UnauthorizedError extends DomainError {}

export abstract class UnprocessableError extends DomainError {}

export abstract class BadGatewayError extends DomainError {}

export abstract class ServiceUnavailableError extends DomainError {}
