import {
  ArgumentsHost,
  Catch,
  ConflictException,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { ConflictError, NotFoundError } from './domain-error';

@Catch()
export class ErrorResponseFilter implements ExceptionFilter {
  private readonly logger = new Logger(ErrorResponseFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const httpException = this.toHttpException(exception);
    const statusCode = httpException.getStatus();
    const exceptionResponse = httpException.getResponse();
    const responseBody =
      typeof exceptionResponse === 'object'
        ? exceptionResponse
        : { message: exceptionResponse };
    this.httpAdapterHost.httpAdapter.reply(
      host.switchToHttp().getResponse(),
      {
        statusCode,
        ...responseBody,
        errorCode: httpException.errorCode ?? HttpStatus[statusCode],
      },
      statusCode,
    );
  }

  private toHttpException(exception: unknown) {
    if (exception instanceof HttpException) return exception;
    if (exception instanceof NotFoundError) {
      return new NotFoundException(undefined, {
        cause: exception,
        errorCode: exception.code,
      });
    }
    if (exception instanceof ConflictError) {
      return new ConflictException(undefined, {
        cause: exception,
        errorCode: exception.code,
      });
    }
    this.logger.error(exception);
    return new InternalServerErrorException();
  }
}
