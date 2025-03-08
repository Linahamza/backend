import {MigrationInterface, QueryRunner} from "typeorm";

export class AddEvolutionsFields1741100606215 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "product_variant" ADD "customFieldsAvailability" boolean`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant" ADD "customFieldsEvolution_parsing_date" character varying(255)`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant" ADD "customFieldsCertification" character varying(255)`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant" ADD "customFieldsFormat" character varying(255)`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant" ADD "customFieldsIngredients" text`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant" ADD "customFieldsIngredients_clean" text`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant" ADD "customFieldsOn_discount" boolean`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant" ADD "customFieldsPrice_per_packaging" double precision`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant" ADD "customFieldsPrice_per_unit" double precision`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant" ADD "customFieldsWeight_per_packaging" double precision`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "product_variant" DROP COLUMN "customFieldsWeight_per_packaging"`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant" DROP COLUMN "customFieldsPrice_per_unit"`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant" DROP COLUMN "customFieldsPrice_per_packaging"`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant" DROP COLUMN "customFieldsOn_discount"`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant" DROP COLUMN "customFieldsIngredients_clean"`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant" DROP COLUMN "customFieldsIngredients"`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant" DROP COLUMN "customFieldsFormat"`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant" DROP COLUMN "customFieldsCertification"`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant" DROP COLUMN "customFieldsEvolution_parsing_date"`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant" DROP COLUMN "customFieldsAvailability"`, undefined);
   }

}
