import { MigrationInterface, QueryRunner } from 'typeorm';

/** Member 2's users migration and CreateDepartmentsAndCourses must run first. */
export class CreateCourseOfferings1794780001000 implements MigrationInterface {
  name = 'CreateCourseOfferings1794780001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."course_offerings_semester_enum" AS ENUM('spring', 'summer', 'fall')`,
    );
    await queryRunner.query(`CREATE TABLE "course_offerings" (
      "id" SERIAL NOT NULL,
      "courseId" integer NOT NULL,
      "teacherId" integer NOT NULL,
      "semester" "public"."course_offerings_semester_enum" NOT NULL,
      "year" integer NOT NULL,
      "section" character varying(5) NOT NULL,
      "capacity" integer NOT NULL,
      "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "UQ_offering_course_term_section" UNIQUE ("courseId", "semester", "year", "section"),
      CONSTRAINT "PK_f174de9e3b3a04f05870a8684c8" PRIMARY KEY ("id")
    )`);
    await queryRunner.query(`ALTER TABLE "course_offerings"
      ADD CONSTRAINT "FK_edde27e4419c217a3091a186349"
      FOREIGN KEY ("courseId") REFERENCES "courses"("id")
      ON DELETE RESTRICT ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "course_offerings"
      ADD CONSTRAINT "FK_3f20d857db472ec87a598f267f2"
      FOREIGN KEY ("teacherId") REFERENCES "users"("id")
      ON DELETE RESTRICT ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "course_offerings" DROP CONSTRAINT "FK_3f20d857db472ec87a598f267f2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_offerings" DROP CONSTRAINT "FK_edde27e4419c217a3091a186349"`,
    );
    await queryRunner.query(`DROP TABLE "course_offerings"`);
    await queryRunner.query(
      `DROP TYPE "public"."course_offerings_semester_enum"`,
    );
  }
}
