import {MigrationInterface, QueryRunner} from "typeorm";

export class CorrectWords1741130852502 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "customFieldsParsingduration"`, undefined);
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "customFieldsBrandid"`, undefined);
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "customFieldsOriginid"`, undefined);
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "customFieldsMeasureunitforpackaging"`, undefined);
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "customFieldsMeasureunitforpriceperunit"`, undefined);
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "customFieldsBrandname"`, undefined);
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "customFieldsOrigincountry"`, undefined);
        await queryRunner.query(`ALTER TABLE "product" ADD "customFieldsMeasure_unit_for_packaging" character varying(255)`, undefined);
        await queryRunner.query(`ALTER TABLE "product" ADD "customFieldsMeasure_unit_for_priceperunit" character varying(255)`, undefined);
        await queryRunner.query(`ALTER TABLE "product" ADD "customFieldsParsing_duration" integer`, undefined);
        await queryRunner.query(`ALTER TABLE "product" ADD "customFieldsBrand_id" integer`, undefined);
        await queryRunner.query(`ALTER TABLE "product" ADD "customFieldsBrand_name" character varying(255)`, undefined);
        await queryRunner.query(`ALTER TABLE "product" ADD "customFieldsOrigin_id" integer`, undefined);
        await queryRunner.query(`ALTER TABLE "product" ADD "customFieldsOrigin_country" character varying(255)`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "customFieldsOrigin_country"`, undefined);
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "customFieldsOrigin_id"`, undefined);
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "customFieldsBrand_name"`, undefined);
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "customFieldsBrand_id"`, undefined);
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "customFieldsParsing_duration"`, undefined);
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "customFieldsMeasure_unit_for_priceperunit"`, undefined);
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "customFieldsMeasure_unit_for_packaging"`, undefined);
        await queryRunner.query(`ALTER TABLE "product" ADD "customFieldsOrigincountry" character varying(255)`, undefined);
        await queryRunner.query(`ALTER TABLE "product" ADD "customFieldsBrandname" character varying(255)`, undefined);
        await queryRunner.query(`ALTER TABLE "product" ADD "customFieldsMeasureunitforpriceperunit" character varying(255)`, undefined);
        await queryRunner.query(`ALTER TABLE "product" ADD "customFieldsMeasureunitforpackaging" character varying(255)`, undefined);
        await queryRunner.query(`ALTER TABLE "product" ADD "customFieldsOriginid" integer`, undefined);
        await queryRunner.query(`ALTER TABLE "product" ADD "customFieldsBrandid" integer`, undefined);
        await queryRunner.query(`ALTER TABLE "product" ADD "customFieldsParsingduration" integer`, undefined);
   }

}
