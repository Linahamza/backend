import { Client } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables from the .env file
dotenv.config();

// Create a new PostgreSQL client instance using environment variables
const client = new Client({
  host: process.env.DB_HOST,       
  port: Number(process.env.DB_PORT) ,      
  user: process.env.DB_USERNAME ,    
  password: process.env.DB_PASSWORD ,    
  database: process.env.DB_NAME , 
});

async function updateProductVariantPrices() {
  try {
    // Connect to the PostgreSQL database
    await client.connect();
    console.log('Connected to the database successfully!');

    // SQL query to update price in product_variant_price from product_variant
    const updateQuery = `
      UPDATE "product_variant_price" SET
        "price" = ROUND(COALESCE(pv."customFieldsPrice_per_unit", 0) * 100)::INTEGER,
        "updatedAt" = CURRENT_TIMESTAMP
      FROM "product_variant" pv
      WHERE "product_variant_price"."variantId" = pv."id"
        AND (pv."customFieldsPrice_per_unit" IS NOT NULL OR pv."customFieldsPrice_per_unit" IS NULL);
    `;

    // Execute the update query
    const res = await client.query(updateQuery);
    console.log('Price updated successfully:', res.rowCount, 'rows updated.');

  } catch (error) {
    console.error('Error updating data:', error);
  } finally {
    // Close the database connection
    await client.end();
    console.log('Database connection closed.');
  }
}

// Call the function to update the data
updateProductVariantPrices();
