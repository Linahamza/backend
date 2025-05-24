import {MigrationInterface, QueryRunner} from "typeorm";

export class AddCategoriesCarrefour1742743216589 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "collection" ADD "customFieldsCategorie_parent" character varying(255)`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "collection" DROP COLUMN "customFieldsCategorie_parent"`, undefined);
   }

}
