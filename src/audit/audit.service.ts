import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { paginate } from '../common/utils/paginate';
import { AuditQueryDto } from './dto/audit-query.dto';
import { AuditLog } from './entities/audit-log.entity';

export interface AuditEntry {
  actorId?: number | null;
  actorRole?: string | null;
  action: string;
  entity: string;
  entityId?: string | number | null;
  details?: Record<string, unknown> | null;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  // logging should never break the actual request
  async log(entry: AuditEntry): Promise<void> {
    try {
      await this.auditRepo.save(
        this.auditRepo.create({
          actorId: entry.actorId ?? null,
          actorRole: entry.actorRole ?? null,
          action: entry.action,
          entity: entry.entity,
          entityId: entry.entityId == null ? null : String(entry.entityId),
          details: entry.details ?? null,
        }),
      );
    } catch (error) {
      this.logger.error(
        `Could not write audit log ${entry.action}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async findAll(query: AuditQueryDto) {
    const where: FindOptionsWhere<AuditLog> = {};
    if (query.entity) where.entity = query.entity;
    if (query.action) where.action = query.action;
    if (query.actorId) where.actorId = query.actorId;
    const [items, total] = await this.auditRepo.findAndCount({
      where,
      order: { id: 'DESC' },
      skip: query.skip,
      take: query.limit,
    });
    return paginate(items, total, query.page, query.limit);
  }
}
