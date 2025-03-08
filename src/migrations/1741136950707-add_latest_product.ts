import {MigrationInterface, QueryRunner} from "typeorm";

export class AddLatestProduct1741136950707 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "product" ADD "customFieldsMarket_id" integer`, undefined);
        await queryRunner.query(`ALTER TABLE "product" ADD "customFieldsMarket_name" character varying(255)`, undefined);
        await queryRunner.query(`ALTER TABLE "product" ADD "customFieldsMarket_address" character varying(255)`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant" ADD "customFieldsCarbohydrates" double precision`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant" ADD "customFieldsSugars" double precision`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant" ADD "customFieldsKcal" double precision`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant" ADD "customFieldsKj" double precision`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant" ADD "customFieldsFats" double precision`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant" ADD "customFieldsSaturates" double precision`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant" ADD "customFieldsProteins" double precision`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant" ADD "customFieldsCalcium" double precision`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant" ADD "customFieldsIodine" double precision`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant" ADD "customFieldsIron" double precision`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant" ADD "customFieldsSalt" double precision`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant" ADD "customFieldsSodium" double precision`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant" ADD "customFieldsZinc" double precision`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant" ADD "customFieldsVitamin_a" double precision`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant" ADD "customFieldsVitamin_b1" double precision`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant" ADD "customFieldsVitamin_c" double precision`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant" ADD "customFieldsVitamin_d" double precision`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "product_variant" DROP COLUMN "customFieldsVitamin_d"`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant" DROP COLUMN "customFieldsVitamin_c"`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant" DROP COLUMN "customFieldsVitamin_b1"`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant" DROP COLUMN "customFieldsVitamin_a"`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant" DROP COLUMN "customFieldsZinc"`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant" DROP COLUMN "customFieldsSodium"`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant" DROP COLUMN "customFieldsSalt"`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant" DROP COLUMN "customFieldsIron"`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant" DROP COLUMN "customFieldsIodine"`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant" DROP COLUMN "customFieldsCalcium"`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant" DROP COLUMN "customFieldsProteins"`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant" DROP COLUMN "customFieldsSaturates"`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant" DROP COLUMN "customFieldsFats"`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant" DROP COLUMN "customFieldsKj"`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant" DROP COLUMN "customFieldsKcal"`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant" DROP COLUMN "customFieldsSugars"`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant" DROP COLUMN "customFieldsCarbohydrates"`, undefined);
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "customFieldsMarket_address"`, undefined);
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "customFieldsMarket_name"`, undefined);
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "customFieldsMarket_id"`, undefined);
   }

}
