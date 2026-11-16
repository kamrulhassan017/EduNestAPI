import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEnrollments1794780003000 implements MigrationInterface {
  name = 'CreateEnrollments1794780003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."enrollments_status_enum" AS ENUM('enrolled', 'dropped')`,
    );
    await queryRunner.query(
      `CREATE TABLE "enrollments" ("id" SERIAL NOT NULL, "studentId" integer NOT NULL, "offeringId" integer NOT NULL, "status" "public"."enrollments_status_enum" NOT NULL DEFAULT 'enrolled', "enrolledAt" TIMESTAMP NOT NULL DEFAULT now(), "droppedAt" TIMESTAMP WITH TIME ZONE, "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_enrollment_student_offering" UNIQUE ("studentId", "offeringId"), CONSTRAINT "PK_7c0f752f9fb68bf6ed7367ab00f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "enrollments" ADD CONSTRAINT "FK_bf3ba3dfa95e2df7388eb4589fd" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "enrollments" ADD CONSTRAINT "FK_952168ead3741ebc903f19aea23" FOREIGN KEY ("offeringId") REFERENCES "course_offerings"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "enrollments" DROP CONSTRAINT "FK_952168ead3741ebc903f19aea23"`,
    );
    await queryRunner.query(
      `ALTER TABLE "enrollments" DROP CONSTRAINT "FK_bf3ba3dfa95e2df7388eb4589fd"`,
    );
    await queryRunner.query(`DROP TABLE "enrollments"`);
    await queryRunner.query(`DROP TYPE "public"."enrollments_status_enum"`);
  }
}
