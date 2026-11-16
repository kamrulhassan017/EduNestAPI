import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuditLogs1794780002000 implements MigrationInterface {
  name = 'CreateAuditLogs1794780002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "audit_logs" ("id" SERIAL NOT NULL, "actorId" integer, "actorRole" character varying(20), "action" character varying(50) NOT NULL, "entity" character varying(50) NOT NULL, "entityId" character varying(50), "details" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2dc33f7f3c22e2e7badafca1d1" ON "audit_logs" ("actorId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2643f2a68c662985433dbddca1" ON "audit_logs" ("entity", "entityId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2643f2a68c662985433dbddca1"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2dc33f7f3c22e2e7badafca1d1"`,
    );
    await queryRunner.query(`DROP TABLE "audit_logs"`);
  }
}
