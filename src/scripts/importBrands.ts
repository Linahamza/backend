import { Client } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// PostgreSQL client setup
const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'carrefour33',
});

async function importBrands() {
  try {
    // Connect to PostgreSQL
    await client.connect();
    console.log('✅ Connected to PostgreSQL');

    // Start a transaction
    await client.query('BEGIN');

    // Step 1: Create the root facet "brand_facet" if it doesn't exist
    const rootFacetCode = 'brand_facet';
    let rootFacetId;

    const rootFacetRes = await client.query(
      `INSERT INTO "facet" ("code", "createdAt", "updatedAt") 
       VALUES ($1, NOW(), NOW()) 
       ON CONFLICT ("code") DO NOTHING 
       RETURNING "id";`,
      [rootFacetCode]
    );

    if (rootFacetRes.rows.length > 0) {
      rootFacetId = rootFacetRes.rows[0].id;
    } else {
      const existingRootFacet = await client.query(
        `SELECT "id" FROM "facet" WHERE "code" = $1`,
        [rootFacetCode]
      );
      rootFacetId = existingRootFacet.rows[0]?.id;
    }

    if (!rootFacetId) {
      throw new Error('❌ Failed to retrieve or create root facet "brand_facet"');
    }

    console.log(`📌 Root facet "brand_facet" ID: ${rootFacetId}`);

    // Step 2: Fetch all brands with their IDs
    const result = await client.query('SELECT id, name FROM "brands"');
    const brands = result.rows;
    console.log(`📦 Found ${brands.length} brands to import`);

    // Step 3: Map to store old brand_id -> new facet_value_id
    const brandIdMap = new Map();

    for (const brand of brands) {
      const { id: oldBrandId, name } = brand;
      const sanitizedCode = name.trim().toLowerCase().replace(/\s+/g, '_');

      // Step 4: Insert into "facet_value" under root facet
      const facetValueRes = await client.query(
        `INSERT INTO "facet_value" ("facetId", "code", "createdAt", "updatedAt") 
         VALUES ($1, $2, NOW(), NOW()) 
         ON CONFLICT ("facetId", "code") DO NOTHING 
         RETURNING "id";`,
        [rootFacetId, sanitizedCode]
      );

      let facetValueId = facetValueRes.rows[0]?.id;

      if (!facetValueId) {
        const existingFacetValue = await client.query(
          `SELECT "id" FROM "facet_value" WHERE "facetId" = $1 AND "code" = $2`,
          [rootFacetId, sanitizedCode]
        );
        facetValueId = existingFacetValue.rows[0]?.id;
      }

      if (!facetValueId) {
        console.error(`❌ Failed to retrieve facet_value_id for brand: ${name}`);
        continue;
      }

      // Step 5: Insert facet_value_translation if it doesn't exist
      const existingTranslation = await client.query(
        `SELECT "id" FROM "facet_value_translation" WHERE "baseId" = $1 AND "languageCode" = 'en'`,
        [facetValueId]
      );

      if (existingTranslation.rows.length === 0) {
        await client.query(
          `INSERT INTO "facet_value_translation" ("baseId", "languageCode", "name") 
           VALUES ($1, 'en', $2) 
           ON CONFLICT DO NOTHING;`,
          [facetValueId, name]
        );
      }

      // Step 6: Insert into facet_value_channels_channel
      const channelId = 1; // Replace with actual channel ID
      await client.query(
        `INSERT INTO "facet_value_channels_channel" ("facetValueId", "channelId") 
         VALUES ($1, $2) 
         ON CONFLICT DO NOTHING;`,
        [facetValueId, channelId]
      );

      // Store mapping for updating products
      brandIdMap.set(oldBrandId, facetValueId);
    }

    // Step 7: Insert into facet_channels_channel
    const channelId = 1; // Replace with actual channel ID
    await client.query(
      `INSERT INTO "facet_channels_channel" ("facetId", "channelId") 
       VALUES ($1, $2) 
       ON CONFLICT DO NOTHING;`,
      [rootFacetId, channelId]
    );

    // Step 8: Insert into facet_translation
    await client.query(
      `INSERT INTO "facet_translation" ("baseId", "languageCode", "name") 
       VALUES ($1, 'en', $2) 
       ON CONFLICT DO NOTHING;`,
      [rootFacetId, 'Brand Facet']
    );

    console.log(`🔄 Updating products table with new brand_id mappings...`);

    // Step 9: Bulk update for products.brand_id
    if (brandIdMap.size > 0) {
      const updateCases = Array.from(brandIdMap.entries())
        .map(([oldBrandId, newFacetValueId]) => `WHEN ${oldBrandId} THEN ${newFacetValueId}`)
        .join(' ');

      await client.query(`
        UPDATE "products"
        SET "brand_id" = CASE "brand_id" 
          ${updateCases} 
        END
        WHERE "brand_id" IN (${Array.from(brandIdMap.keys()).join(',')});
      `);
    }

    // Commit the transaction
    await client.query('COMMIT');
    console.log('✅ Brands, facet values, translations, and products updated successfully!');
  } catch (error) {
    // Rollback the transaction in case of error
    await client.query('ROLLBACK');
    console.error('❌ Error importing brands:', error);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

// Run the script
importBrands();