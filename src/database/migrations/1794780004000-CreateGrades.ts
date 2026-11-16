import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGrades1794780004000 implements MigrationInterface {
  name = 'CreateGrades1794780004000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "grades" ("id" SERIAL NOT NULL, "enrollmentId" integer NOT NULL, "marks" numeric(5,2) NOT NULL, "letter" character varying(2) NOT NULL, "gradePoint" numeric(3,2) NOT NULL, "gradedById" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "REL_dd35dc4bf94330b26eef9d0ea9" UNIQUE ("enrollmentId"), CONSTRAINT "PK_4740fb6f5df2505a48649f1687b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "grades" ADD CONSTRAINT "FK_dd35dc4bf94330b26eef9d0ea96" FOREIGN KEY ("enrollmentId") REFERENCES "enrollments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "grades" ADD CONSTRAINT "FK_bb2c0b9046d01f4f6b1396f7803" FOREIGN KEY ("gradedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "grades" DROP CONSTRAINT "FK_bb2c0b9046d01f4f6b1396f7803"`,
    );
    await queryRunner.query(
      `ALTER TABLE "grades" DROP CONSTRAINT "FK_dd35dc4bf94330b26eef9d0ea96"`,
    );
    await queryRunner.query(`DROP TABLE "grades"`);
  }
}
