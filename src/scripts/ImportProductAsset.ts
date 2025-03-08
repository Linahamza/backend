import { Client } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const client = new Client({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) ,
  user: process.env.DB_USERNAME ,
  password: process.env.DB_PASSWORD ,
  database: process.env.DB_NAME ,
});

async function migrateData() {
  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL.');

    // 🚀 Start transaction
    await client.query('BEGIN');

    // 📸 Insert product assets by associating products with their valid assets, while checking for existing entries
    const insertProductAssetQuery = `
      INSERT INTO "product_asset" ("createdAt", "updatedAt", "assetId", "position", "productId")
      SELECT NOW(), NOW(), a."id", img.position, p."id"
      FROM (
        SELECT 
          pr."id" AS product_id, 
          jsonb_array_elements_text(pr."lang_images"::jsonb) AS image_url, 
          ROW_NUMBER() OVER (PARTITION BY pr."id" ORDER BY pr."id") AS position
        FROM "products" pr
        WHERE pr."lang_images" IS NOT NULL AND pr."lang_images" <> ''
      ) img
      JOIN "asset" a ON a."source" = img.image_url
      JOIN "products" p ON p."id" = img.product_id
      WHERE NOT EXISTS (
        SELECT 1
        FROM "product_asset" pa
        WHERE pa."productId" = p."id" AND pa."assetId" = a."id"
      )
      ON CONFLICT DO NOTHING;
    `;

    const result = await client.query(insertProductAssetQuery);
    console.log(`📸 ${result.rowCount} product assets inserted successfully!`);

    // ✅ Commit transaction
    await client.query('COMMIT');
    console.log('🚀 Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration error:', error);
    await client.query('ROLLBACK');
    console.log('🔄 ROLLBACK executed.');
  } finally {
    await client.end();
    console.log('🔌 Connection closed.');
  }
}

// Run the migration
migrateData();
