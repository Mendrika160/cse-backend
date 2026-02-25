import type { HealthResponseDto } from './dto/health-response.dto';

export class HealthService {
  getHealth(): HealthResponseDto {
    return {
      ok: true,
      service: 'cse-backend',
      timestamp: new Date().toISOString(),
    };
  }
}
