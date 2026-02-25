import { z } from 'zod';
import { BadRequestError } from '../../../core/errors/bad-request-error';

const helpRequestIdSchema = z.object({
  id: z.string().min(1),
});

export function parseHelpRequestIdParam(payload: unknown): string {
  const parsed = helpRequestIdSchema.safeParse(payload);
  if (!parsed.success) {
    throw new BadRequestError('Invalid help request id param', parsed.error.flatten());
  }

  return parsed.data.id;
}
