import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDepartmentsAndCourses1794780000000 implements MigrationInterface {
  name = 'CreateDepartmentsAndCourses1794780000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "departments" (
      "id" SERIAL NOT NULL,
      "name" character varying(100) NOT NULL,
      "code" character varying(10) NOT NULL,
      "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "UQ_8681da666ad9699d568b3e91064" UNIQUE ("name"),
      CONSTRAINT "UQ_91fddbe23e927e1e525c152baa3" UNIQUE ("code"),
      CONSTRAINT "PK_839517a681a86bb84cbcc6a1e9d" PRIMARY KEY ("id")
    )`);
    await queryRunner.query(`CREATE TABLE "courses" (
      "id" SERIAL NOT NULL,
      "code" character varying(20) NOT NULL,
      "title" character varying(150) NOT NULL,
      "credits" integer NOT NULL,
      "description" text,
      "departmentId" integer NOT NULL,
      "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "UQ_86b3589486bac01d2903e22471c" UNIQUE ("code"),
      CONSTRAINT "PK_3f70a487cc718ad8eda4e6d58c9" PRIMARY KEY ("id")
    )`);
    await queryRunner.query(`ALTER TABLE "courses"
      ADD CONSTRAINT "FK_2a26294560102d94bc4c67ecfe5"
      FOREIGN KEY ("departmentId") REFERENCES "departments"("id")
      ON DELETE RESTRICT ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "courses" DROP CONSTRAINT "FK_2a26294560102d94bc4c67ecfe5"`,
    );
    await queryRunner.query(`DROP TABLE "courses"`);
    await queryRunner.query(`DROP TABLE "departments"`);
  }
}
