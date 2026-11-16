import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiEnvelope } from '../common/swagger/api-envelope.decorator';
import { ApiErrors } from '../common/swagger/api-errors.decorator';
import { Role } from '../users/enums/role.enum';
import { AuditService } from './audit.service';
import { AuditQueryDto } from './dto/audit-query.dto';
import { AuditLog } from './entities/audit-log.entity';

@ApiTags('Audit')
@ApiBearerAuth('access-token')
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles(Role.ADMIN)
  @ResponseMessage('Audit trail fetched')
  @ApiOperation({ summary: 'Audit trail of every change (admin)' })
  @ApiEnvelope(AuditLog, { paginated: true })
  @ApiErrors(400, 401, 403)
  findAll(@Query() query: AuditQueryDto) {
    return this.auditService.findAll(query);
  }
}
