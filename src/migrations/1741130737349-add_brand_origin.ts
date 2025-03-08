import {MigrationInterface, QueryRunner} from "typeorm";

export class AddBrandOrigin1741130737349 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "product" ADD "customFieldsBrandid" integer`, undefined);
        await queryRunner.query(`ALTER TABLE "product" ADD "customFieldsBrandname" character varying(255)`, undefined);
        await queryRunner.query(`ALTER TABLE "product" ADD "customFieldsOriginid" integer`, undefined);
        await queryRunner.query(`ALTER TABLE "product" ADD "customFieldsOrigincountry" character varying(255)`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "customFieldsOrigincountry"`, undefined);
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "customFieldsOriginid"`, undefined);
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "customFieldsBrandname"`, undefined);
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "customFieldsBrandid"`, undefined);
   }

}
