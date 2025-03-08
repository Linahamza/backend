import {MigrationInterface, QueryRunner} from "typeorm";

export class AddChangesOnProduct1741188047110 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "product" ADD "customFieldsLang_title" character varying(255)`, undefined);
        await queryRunner.query(`ALTER TABLE "product" ADD "customFieldsLang_desc" character varying(255)`, undefined);
        await queryRunner.query(`ALTER TABLE "product" ADD "customFieldsLang_images" character varying(255)`, undefined);
        await queryRunner.query(`ALTER TABLE "product" ADD "customFieldsEan" character varying(255)`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "customFieldsEan"`, undefined);
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "customFieldsLang_images"`, undefined);
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "customFieldsLang_desc"`, undefined);
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "customFieldsLang_title"`, undefined);
   }

}
