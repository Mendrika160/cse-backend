import type { RequestStatus } from '../../../generated/prisma/enums';

export type HelpRequestResponseDto = {
  id: string;
  beneficiaryId: string;
  managerId: string | null;
  type: string;
  amount: number;
  description: string;
  status: RequestStatus;
  createdAt: Date;
  updatedAt: Date;
};
