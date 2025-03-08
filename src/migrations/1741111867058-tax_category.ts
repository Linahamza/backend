import {MigrationInterface, QueryRunner} from "typeorm";

export class TaxCategory1741111867058 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "tax_category" DROP CONSTRAINT "tax_category_name_unique"`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "tax_category" ADD CONSTRAINT "tax_category_name_unique" UNIQUE ("name")`, undefined);
   }

}
