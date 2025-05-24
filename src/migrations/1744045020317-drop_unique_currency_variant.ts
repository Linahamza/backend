import {MigrationInterface, QueryRunner} from "typeorm";

export class DropUniqueCurrencyVariant1744045020317 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "product_variant_price" DROP CONSTRAINT "unique_currency_variant"`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "product_variant_price" ADD CONSTRAINT "unique_currency_variant" UNIQUE ("currencyCode", "variantId")`, undefined);
   }

}
