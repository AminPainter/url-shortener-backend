import {
  ArgumentsHost,
  BadGatewayException,
  Catch,
  ConflictException,
  ExceptionFilter,
  ForbiddenException,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { throwError } from 'rxjs';
import {
  BadGatewayError,
  ConflictError,
  DomainError,
  ForbiddenError,
  NotFoundError,
  ServiceUnavailableError,
  UnauthorizedError,
  UnprocessableError,
} from './domain-error';

const CATEGORY_EXCEPTIONS: [
  abstract new (...args: never[]) => DomainError,
  new (
    objectOrError?: unknown,
    options?: { cause?: unknown; errorCode?: string },
  ) => HttpException,
][] = [
  [NotFoundError, NotFoundException],
  [ConflictError, ConflictException],
  [ForbiddenError, ForbiddenException],
  [UnauthorizedError, UnauthorizedException],
  [UnprocessableError, UnprocessableEntityException],
  [BadGatewayError, BadGatewayException],
  [ServiceUnavailableError, ServiceUnavailableException],
];

@Catch()
export class ErrorResponseFilter implements ExceptionFilter {
  private readonly logger = new Logger(ErrorResponseFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const httpException = this.toHttpException(exception);
    const statusCode = httpException.getStatus();
    const exceptionResponse = httpException.getResponse();
    const responseBody = {
      statusCode,
      ...(typeof exceptionResponse === 'object'
        ? exceptionResponse
        : { message: exceptionResponse }),
      errorCode: httpException.errorCode ?? HttpStatus[statusCode],
    };
    if (host.getType() === 'rpc') return throwError(() => responseBody);
    this.httpAdapterHost.httpAdapter.reply(
      host.switchToHttp().getResponse(),
      responseBody,
      statusCode,
    );
  }

  private toHttpException(exception: unknown) {
    if (exception instanceof HttpException) return exception;
    const match = CATEGORY_EXCEPTIONS.find(
      ([category]) => exception instanceof category,
    );
    if (match && exception instanceof DomainError) {
      const [, HttpExceptionType] = match;
      return new HttpExceptionType(undefined, {
        cause: exception,
        errorCode: exception.code,
      });
    }
    this.logger.error(exception);
    return new InternalServerErrorException();
  }
}
