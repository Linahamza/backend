import {MigrationInterface, QueryRunner} from "typeorm";

export class AddBrandsToFacet1740962564620 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "facet_value_translation" DROP CONSTRAINT "unique_translation"`, undefined);
        await queryRunner.query(`ALTER TABLE "facet_value" DROP CONSTRAINT "facet_value_facetid_code_unique"`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "facet_value" ADD CONSTRAINT "facet_value_facetid_code_unique" UNIQUE ("code", "facetId")`, undefined);
        await queryRunner.query(`ALTER TABLE "facet_value_translation" ADD CONSTRAINT "unique_translation" UNIQUE ("languageCode", "baseId")`, undefined);
   }

}
