import { Client } from 'pg';
import axios from 'axios';
import sharp from 'sharp';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USERNAME ,
  password: process.env.DB_PASSWORD ,
  database: process.env.DB_NAME ,
});

async function updateAssets() {
  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL');

    // Query all assets to update width, height, and fileSize
    const assets = await client.query(`SELECT id, source FROM asset`);
    console.log(`📦 ${assets.rows.length} assets found.`);

    for (const asset of assets.rows) {
      const assetId = asset.id;
      const imageUrl = asset.source;  // Assuming the 'source' column contains the image URL

      try {
        // Fetch image data from the URL
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });

        // Get image metadata using sharp
        const metadata = await sharp(response.data).metadata();
        const fileSize = response.headers['content-length'];  // File size from the HTTP response headers

        // Update asset data in the database
        await client.query(
          `UPDATE asset
           SET width = $1, height = $2, "fileSize" = $3
           WHERE id = $4`,
          [metadata.width, metadata.height, fileSize, assetId]
        );

        console.log(`✅ Asset ${assetId} updated successfully.`);
      } catch (err: unknown) {
        if (err instanceof Error) {
          console.log(`⚠️ Error processing image for asset ${assetId}: ${err.message}`);
        } else {
          console.log(`⚠️ Unknown error for asset ${assetId}`);
        }
      }
    }

    console.log("🎉 Asset update completed!");
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error("❌ Error during asset update:", err.message);
    } else {
      console.error("❌ Unknown error during asset update");
    }
  } finally {
    await client.end();
    console.log("🔌 Connection closed.");
  }
}

// Run the update
updateAssets();
