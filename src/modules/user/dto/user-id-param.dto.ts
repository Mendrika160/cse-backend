import { z } from 'zod';
import { BadRequestError } from '../../../core/errors/bad-request-error';

const userIdParamSchema = z.object({
  id: z.string().min(1),
});

export function parseUserIdParamDto(payload: unknown): string {
  const parsed = userIdParamSchema.safeParse(payload);
  if (!parsed.success) {
    throw new BadRequestError('Invalid user id param', parsed.error.flatten());
  }

  return parsed.data.id;
}
