import {MigrationInterface, QueryRunner} from "typeorm";

export class AddCostumFieldsPromotion1741361579888 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "promotion" ADD "customFieldsEvolution_id" integer`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "promotion" DROP COLUMN "customFieldsEvolution_id"`, undefined);
   }

}
