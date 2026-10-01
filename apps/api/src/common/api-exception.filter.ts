import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const reply = context.getResponse<FastifyReply>();
    const request = context.getRequest<FastifyRequest>();
    const requestId = String(request.id ?? '');
    const mapped = this.map(exception);

    if (mapped.status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} ${mapped.status} ${requestId}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    reply.header('x-request-id', requestId);
    reply.status(mapped.status).send({
      statusCode: mapped.status,
      message: mapped.message,
      requestId,
    });
  }

  private map(exception: unknown): { status: number; message: string } {
    if (exception instanceof ZodError) {
      return {
        status: HttpStatus.BAD_REQUEST,
        message: exception.issues[0]?.message ?? 'Invalid request',
      };
    }
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      const message =
        typeof response === 'string'
          ? response
          : Array.isArray((response as { message?: unknown }).message)
            ? String((response as { message: string[] }).message[0])
            : String((response as { message?: unknown }).message ?? exception.message);
      return { status: exception.getStatus(), message };
    }
    if (
      exception &&
      typeof exception === 'object' &&
      'message' in exception &&
      typeof exception.message === 'string'
    ) {
      return { status: HttpStatus.BAD_REQUEST, message: exception.message };
    }
    return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Something went wrong' };
  }
}
