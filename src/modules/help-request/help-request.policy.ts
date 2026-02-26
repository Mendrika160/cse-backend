import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ConflictError } from '../../core/errors/conflict-error';
import { ForbiddenError } from '../../core/errors/forbidden-error';
import { UnauthorizedError } from '../../core/errors/unauthorized-error';
import { parseHelpRequestIdParam } from './dto/help-request-id-param.dto';
import type { HelpRequestService } from './help-request.service';

function getAuthenticatedUser(req: Request): NonNullable<Request['user']> {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  return req.user;
}

function getLoadedRequest(req: Request): NonNullable<Request['helpRequest']> {
  if (!req.helpRequest) {
    throw new UnauthorizedError('Help request context is missing');
  }

  return req.helpRequest;
}

export type HelpRequestPolicies = {
  loadRequest: RequestHandler;
  requireBeneficiary: RequestHandler;
  requireReadScope: RequestHandler;
  requireOwner: RequestHandler;
  requireManager: RequestHandler;
  requireDraft: RequestHandler;
  requireSubmitted: RequestHandler;
  requireApproved: RequestHandler;
};

export function createHelpRequestPolicies(helpRequestService: HelpRequestService): HelpRequestPolicies {
  const loadRequest: RequestHandler = async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const id = parseHelpRequestIdParam(req.params);
      req.helpRequest = await helpRequestService.findByIdOrThrow(id);
      next();
    } catch (error) {
      next(error);
    }
  };

  const requireBeneficiary: RequestHandler = (req: Request, _res: Response, next: NextFunction) => {
    try {
      const user = getAuthenticatedUser(req);
      if (user.role !== 'BENEFICIARY') {
        throw new ForbiddenError('Only BENEFICIARY can create help requests', {
          businessCode: 'HELP_REQUEST_CREATE_REQUIRES_BENEFICIARY',
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };

  const requireReadScope: RequestHandler = (req: Request, _res: Response, next: NextFunction) => {
    try {
      const user = getAuthenticatedUser(req);
      const request = getLoadedRequest(req);

      if (user.role === 'BENEFICIARY' && request.beneficiaryId !== user.id) {
        throw new ForbiddenError('You cannot access a request you do not own', {
          businessCode: 'HELP_REQUEST_ACCESS_DENIED_NOT_OWNER',
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };

  const requireOwner: RequestHandler = (req: Request, _res: Response, next: NextFunction) => {
    try {
      const user = getAuthenticatedUser(req);
      const request = getLoadedRequest(req);

      if (request.beneficiaryId !== user.id) {
        throw new ForbiddenError('You cannot modify a request you do not own', {
          businessCode: 'HELP_REQUEST_UPDATE_DENIED_NOT_OWNER',
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };

  const requireManager: RequestHandler = (req: Request, _res: Response, next: NextFunction) => {
    try {
      const user = getAuthenticatedUser(req);
      if (user.role !== 'MANAGER') {
        throw new ForbiddenError('Only MANAGER can perform this action', {
          businessCode: 'HELP_REQUEST_ACTION_REQUIRES_MANAGER',
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };

  const requireDraft: RequestHandler = (req: Request, _res: Response, next: NextFunction) => {
    try {
      const request = getLoadedRequest(req);
      if (request.status !== 'DRAFT') {
        throw new ConflictError('Only DRAFT requests can be modified/submitted', {
          businessCode: 'HELP_REQUEST_REQUIRES_DRAFT',
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };

  const requireSubmitted: RequestHandler = (req: Request, _res: Response, next: NextFunction) => {
    try {
      const request = getLoadedRequest(req);
      if (request.status !== 'SUBMITTED') {
        throw new ConflictError('Only SUBMITTED requests can be approved/rejected', {
          businessCode: 'HELP_REQUEST_REQUIRES_SUBMITTED',
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };

  const requireApproved: RequestHandler = (req: Request, _res: Response, next: NextFunction) => {
    try {
      const request = getLoadedRequest(req);
      if (request.status !== 'APPROVED') {
        throw new ConflictError('Only APPROVED requests can be paid', {
          businessCode: 'HELP_REQUEST_REQUIRES_APPROVED',
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };

  return {
    loadRequest,
    requireBeneficiary,
    requireReadScope,
    requireOwner,
    requireManager,
    requireDraft,
    requireSubmitted,
    requireApproved,
  };
}
