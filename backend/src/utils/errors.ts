export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code = "APP_ERROR",
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(entity = "Registro") {
    super(404, `${entity} nao encontrado.`, "NOT_FOUND");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Voce nao tem permissao para executar esta acao.") {
    super(403, message, "FORBIDDEN");
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Sessao invalida ou expirada. Faca login novamente.") {
    super(401, message, "UNAUTHORIZED");
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message, "CONFLICT");
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string,
    public details?: unknown,
  ) {
    super(422, message, "VALIDATION_ERROR");
  }
}
