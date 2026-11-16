import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Member 2: the users table. Runs before every other migration because
 * course_offerings, enrollments and grades all reference users(id).
 */
export class CreateUsers1794770000000 implements MigrationInterface {
  name = 'CreateUsers1794770000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('admin', 'teacher', 'student')`,
    );
    await queryRunner.query(`CREATE TABLE "users" (
      "id" SERIAL NOT NULL,
      "name" character varying(100) NOT NULL,
      "email" character varying(255) NOT NULL,
      "passwordHash" character varying NOT NULL,
      "role" "public"."users_role_enum" NOT NULL DEFAULT 'student',
      "isActive" boolean NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "UQ_users_email" UNIQUE ("email"),
      CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
    )`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
  }
}
