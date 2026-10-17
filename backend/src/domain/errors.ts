export class DomainError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: string, status: number, message: string, details?: unknown) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function notFound(resource: string, id: string): DomainError {
  return new DomainError("not_found", 404, `${resource} '${id}' was not found`, { resource, id });
}

export function validation(message: string, details?: unknown): DomainError {
  return new DomainError("validation_error", 422, message, details);
}
