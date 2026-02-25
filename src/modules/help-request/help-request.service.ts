import { NotFoundError } from '../../core/errors/not-found-error';
import type { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/auth.service';
import type { CreateHelpRequestDto } from './dto/create-help-request.dto';
import type { EditHelpRequestDto } from './dto/edit-help-request.dto';
import type { HelpRequestResponseDto } from './dto/help-request-response.dto';

const helpRequestSelect = {
  id: true,
  beneficiaryId: true,
  managerId: true,
  type: true,
  amount: true,
  description: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

export class HelpRequestService {
  constructor(private readonly prismaService: PrismaService) {}

  async list(actor: AuthenticatedUser): Promise<HelpRequestResponseDto[]> {
    const rows = await this.prismaService.helpRequest.findMany({
      where: actor.role === 'BENEFICIARY' ? { beneficiaryId: actor.id } : undefined,
      select: helpRequestSelect,
      orderBy: { createdAt: 'desc' },
    });

    return rows;
  }

  async createForBeneficiary(
    beneficiaryId: string,
    input: CreateHelpRequestDto,
  ): Promise<HelpRequestResponseDto> {
    return this.prismaService.helpRequest.create({
      data: {
        beneficiaryId,
        type: input.type,
        amount: input.amount,
        description: input.description,
      },
      select: helpRequestSelect,
    });
  }

  async edit(id: string, input: EditHelpRequestDto): Promise<HelpRequestResponseDto> {
    return this.prismaService.helpRequest.update({
      where: { id },
      data: {
        type: input.type,
        amount: input.amount,
        description: input.description,
      },
      select: helpRequestSelect,
    });
  }

  async submit(id: string): Promise<HelpRequestResponseDto> {
    return this.prismaService.helpRequest.update({
      where: { id },
      data: { status: 'SUBMITTED' },
      select: helpRequestSelect,
    });
  }

  async approve(id: string, managerId: string): Promise<HelpRequestResponseDto> {
    return this.transitionByManager(id, managerId, 'APPROVED');
  }

  async reject(id: string, managerId: string): Promise<HelpRequestResponseDto> {
    return this.transitionByManager(id, managerId, 'REJECTED');
  }

  async pay(id: string, managerId: string): Promise<HelpRequestResponseDto> {
    return this.prismaService.helpRequest.update({
      where: { id },
      data: {
        status: 'PAID',
        managerId,
      },
      select: helpRequestSelect,
    });
  }

  private async transitionByManager(
    id: string,
    managerId: string,
    targetStatus: 'APPROVED' | 'REJECTED',
  ): Promise<HelpRequestResponseDto> {
    return this.prismaService.helpRequest.update({
      where: { id },
      data: {
        status: targetStatus,
        managerId,
      },
      select: helpRequestSelect,
    });
  }

  async findByIdOrThrow(id: string): Promise<HelpRequestResponseDto> {
    const request = await this.prismaService.helpRequest.findUnique({
      where: { id },
      select: helpRequestSelect,
    });

    if (!request) {
      throw new NotFoundError('Help request not found');
    }

    return request;
  }
}
