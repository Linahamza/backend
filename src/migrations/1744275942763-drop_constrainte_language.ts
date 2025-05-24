import {MigrationInterface, QueryRunner} from "typeorm";

export class DropConstrainteLanguage1744275942763 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`DROP INDEX "public"."unique_currency_variant"`, undefined);
        await queryRunner.query(`ALTER TABLE "product_translation" DROP CONSTRAINT "unique_product_language"`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "product_translation" ADD CONSTRAINT "unique_product_language" UNIQUE ("languageCode", "baseId")`, undefined);
        await queryRunner.query(`CREATE UNIQUE INDEX "unique_currency_variant" ON "product_variant_price" ("currencyCode", "variantId") `, undefined);
   }

}
