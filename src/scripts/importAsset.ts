import { Client } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const client = new Client({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function migrateData() {
  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL.');

    // 🚀 Start transaction
    await client.query('BEGIN');


    // 📸 Insert assets for product images
    const insertAssetsQuery = `
      INSERT INTO "asset" ("name", "source", "type", "mimeType", "createdAt", "updatedAt", "width", "height", "fileSize", "preview")
      SELECT 
        -- Extraction du nom de l'image à partir de l'URL
        split_part(image_url, '/', array_length(string_to_array(image_url, '/'), 1)) AS name,
        image_url AS source,
        'IMAGE' AS type,
        'image/jpeg' AS mimeType,
        NOW() AS createdAt,
        NOW() AS updatedAt,
        0 AS width,
        0 AS height,
        0 AS fileSize,
        image_url AS preview
      FROM (
        SELECT 
          jsonb_array_elements_text(pr."lang_images"::jsonb) AS image_url
        FROM "products" pr
        WHERE pr."lang_images" IS NOT NULL AND pr."lang_images" <> ''
      ) img
      ON CONFLICT (source) DO NOTHING;
    `;
    const result = await client.query(insertAssetsQuery);
    console.log(`📸 ${result.rowCount} assets inserted successfully!`);

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
