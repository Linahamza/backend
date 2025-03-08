import {MigrationInterface, QueryRunner} from "typeorm";

export class DropUniqueSource1741264907468 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "asset" DROP CONSTRAINT "unique_source"`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "asset" ADD CONSTRAINT "unique_source" UNIQUE ("source")`, undefined);
   }

}
