import { BadRequestException } from '@nestjs/common';

export function assertNoError(error: { message: string } | null) {
  if (error) throw new BadRequestException(error.message);
}
