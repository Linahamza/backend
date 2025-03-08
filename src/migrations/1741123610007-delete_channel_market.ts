import {MigrationInterface, QueryRunner} from "typeorm";

export class DeleteChannelMarket1741123610007 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "channel" DROP COLUMN "customFieldsMarket_name"`, undefined);
        await queryRunner.query(`ALTER TABLE "channel" DROP COLUMN "customFieldsMarket_address"`, undefined);
        await queryRunner.query(`ALTER TABLE "channel" DROP COLUMN "customFieldsMarket_country"`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "channel" ADD "customFieldsMarket_country" character varying(255)`, undefined);
        await queryRunner.query(`ALTER TABLE "channel" ADD "customFieldsMarket_address" character varying(255)`, undefined);
        await queryRunner.query(`ALTER TABLE "channel" ADD "customFieldsMarket_name" character varying(255)`, undefined);
   }

}
