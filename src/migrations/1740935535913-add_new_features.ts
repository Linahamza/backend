import {MigrationInterface, QueryRunner} from "typeorm";

export class AddNewFeatures1740935535913 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "collection_translation" DROP CONSTRAINT "unique_base_language"`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "collection_translation" ADD CONSTRAINT "unique_base_language" UNIQUE ("languageCode", "baseId")`, undefined);
   }

}
