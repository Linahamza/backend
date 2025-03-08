import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// PostgreSQL Connection
const client = new Client({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function setFeaturedAssets() {
  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL');

    // Fetch first image (lowest assetId) for each product
    const { rows: productImages } = await client.query(`
      SELECT pa."productId", MIN(pa."assetId") as "featuredAssetId"
      FROM product_asset pa
      GROUP BY pa."productId"
    `);

    console.log(`🔍 Found ${productImages.length} products with images.`);

    if (productImages.length === 0) {
      console.log("⚠️ No products found with images.");
      return;
    }

    // Start transaction
    await client.query("BEGIN");

    // Update featured assets in parallel
    await Promise.all(
      productImages.map(({ productId, featuredAssetId }) =>
        client.query(
          `UPDATE product SET "featuredAssetId" = $1 WHERE id = $2`,
          [featuredAssetId, productId]
        )
      )
    );

    // Commit transaction
    await client.query("COMMIT");

    console.log("🎉 Featured asset assignment complete!");
  } catch (err) {
    console.error("❌ Error:", err);
    await client.query("ROLLBACK"); // Rollback in case of error
  } finally {
    await client.end();
    console.log("🔌 Connection closed.");
  }
}

// Run the script
setFeaturedAssets();
