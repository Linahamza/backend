import {MigrationInterface, QueryRunner} from "typeorm";

export class AddIdSourceProduct1745952291131 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "product" ADD "customFieldsSource_id" integer`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "customFieldsSource_id"`, undefined);
   }

}
