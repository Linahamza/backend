import {MigrationInterface, QueryRunner} from "typeorm";

export class AddNewCostumFields1741007930665 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "product" ADD "customFieldsMeasureunitforpackaging" character varying(255)`, undefined);
        await queryRunner.query(`ALTER TABLE "product" ADD "customFieldsMeasureunitforpriceperunit" character varying(255)`, undefined);
        await queryRunner.query(`ALTER TABLE "product" ADD "customFieldsPackaging" character varying(255)`, undefined);
        await queryRunner.query(`ALTER TABLE "product" ADD "customFieldsMatter" character varying(255)`, undefined);
        await queryRunner.query(`ALTER TABLE "product" ADD "customFieldsParsingduration" integer`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "customFieldsParsingduration"`, undefined);
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "customFieldsMatter"`, undefined);
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "customFieldsPackaging"`, undefined);
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "customFieldsMeasureunitforpriceperunit"`, undefined);
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "customFieldsMeasureunitforpackaging"`, undefined);
   }

}
