import {MigrationInterface, QueryRunner} from "typeorm";

export class AddCustomFieldsCustomer1744898779958 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`DROP INDEX "public"."idx_product_name_trgm"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."idx_product_id_deletedat_createdat"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."idx_variantid"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."idx_product_variant_id_deletedat"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."idx_channel_id"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."idx_job_queue_state_createdat"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."idx_product_channels_channel_channelid"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."idx_product_lqb_channel_productid"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."idx_product_variant_channels_channel_productvariantid"`, undefined);
        await queryRunner.query(`ALTER TABLE "customer" ADD "customFieldsExternalprovider" character varying(255)`, undefined);
        await queryRunner.query(`ALTER TABLE "customer" ADD "customFieldsExternalid" character varying(255)`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "customer" DROP COLUMN "customFieldsExternalid"`, undefined);
        await queryRunner.query(`ALTER TABLE "customer" DROP COLUMN "customFieldsExternalprovider"`, undefined);
        await queryRunner.query(`CREATE INDEX "idx_product_variant_channels_channel_productvariantid" ON "product_variant_channels_channel" ("productVariantId") `, undefined);
        await queryRunner.query(`CREATE INDEX "idx_product_lqb_channel_productid" ON "product_channels_channel" ("productId") `, undefined);
        await queryRunner.query(`CREATE INDEX "idx_product_channels_channel_channelid" ON "product_channels_channel" ("channelId") `, undefined);
        await queryRunner.query(`CREATE INDEX "idx_job_queue_state_createdat" ON "job_record" ("createdAt", "queueName", "state") `, undefined);
        await queryRunner.query(`CREATE INDEX "idx_channel_id" ON "channel" ("id") `, undefined);
        await queryRunner.query(`CREATE INDEX "idx_product_variant_id_deletedat" ON "product_variant" ("deletedAt", "id") `, undefined);
        await queryRunner.query(`CREATE INDEX "idx_variantid" ON "product_variant" ("id") `, undefined);
        await queryRunner.query(`CREATE INDEX "idx_product_id_deletedat_createdat" ON "product" ("createdAt", "deletedAt", "id") `, undefined);
        await queryRunner.query(`CREATE INDEX "idx_product_name_trgm" ON "product_translation" ("name") `, undefined);
   }

}
