import { Client } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const client = new Client({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD ,
  database: process.env.DB_NAME ,
});

async function insertProductTranslations() {
  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL.');

    // Fetch products
    const productQuery = `
      SELECT p."id" AS "baseId", p."lang_title" AS "name", p."lang_desc" AS "description"
      FROM "products" p;  
    `;
    const productResult = await client.query(productQuery);

    for (const product of productResult.rows) {
      const baseId = product.baseId;
      const name = product.name || "Unnamed Product";
      const description = product.description || "No description available";
      const languageCode = 'en';
      const timestamp = new Date();
      const slug = name.toLowerCase().replace(/\s+/g, '-');

      await client.query(
        `INSERT INTO "product_translation" ("id", "baseId", "languageCode", "name", "slug", "description", "createdAt", "updatedAt")
         VALUES (nextval('"product_translation_id_seq"'::regclass), $1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT ("id") DO NOTHING;`,
        [baseId, languageCode, name, slug, description, timestamp, timestamp]
      );
    }
    console.log('📌 Product translations inserted successfully!');

    // If product translations are inserted successfully, proceed with product variant translations
    await insertProductVariantTranslations();

  } catch (error) {
    console.error('❌ Error inserting product translations:', error);
    // If there's an error in the first insertion, skip the second insertion
  } finally {
    await client.end(); // Close connection after both operations
    console.log('🔌 Connection closed.');
  }
}

async function insertProductVariantTranslations() {
  try {
    // Fetch product variants with the corresponding product name
    const variantQuery = `
      SELECT e."id" AS "baseId", p."lang_title" AS "name"
      FROM "evolutions" e
      JOIN "products" p ON e."product_id" = p."id";  
    `;
    const variantResult = await client.query(variantQuery);

    for (const variant of variantResult.rows) {
      const baseId = variant.baseId;
      const name = variant.name || "Unnamed Variant";
      const languageCode = 'en';
      const timestamp = new Date();

      await client.query(
        `INSERT INTO "product_variant_translation" ("id", "baseId", "languageCode", "name", "createdAt", "updatedAt")
         VALUES (nextval('"product_variant_translation_id_seq"'::regclass), $1, $2, $3, $4, $5)
         ON CONFLICT ("id") DO NOTHING;`,
        [baseId, languageCode, name, timestamp, timestamp]
      );
    }
    console.log('📌 Product variant translations inserted successfully!');

  } catch (error) {
    console.error('❌ Error inserting product variant translations:', error);
  }
}

// Execute the product translations function
insertProductTranslations();
