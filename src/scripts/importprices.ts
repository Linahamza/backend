import { Client } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables from the .env file
dotenv.config();

// Create a new PostgreSQL client instance using environment variables
const client = new Client({
  host: process.env.DB_HOST ,       
  port: Number(process.env.DB_PORT) ,      
  user: process.env.DB_USERNAME ,    
  password: process.env.DB_PASSWORD ,    
  database: process.env.DB_NAME , 
});

async function insertProductVariantPrices() {
  try {
    // Connect to the PostgreSQL database
    await client.connect();
    console.log('Connected to the database successfully!');

    // SQL query to insert data into product_variant_price from product_variant
    const insertQuery = `
      INSERT INTO "product_variant_price" ("createdAt", "updatedAt", "currencyCode", "price", "variantId", "channelId")
      SELECT 
        CURRENT_TIMESTAMP,  
        CURRENT_TIMESTAMP,  
        'USD',              
        ROUND(
          COALESCE("customFieldsPrice_per_unit", 0)::numeric 
        ) AS "price",   
        "id" AS "variantId",  
        1 AS "channelId"  
      FROM "product_variant"
      WHERE "customFieldsPrice_per_unit" IS NOT NULL OR "customFieldsPrice_per_unit" IS NULL;  
    `;

    // Execute the insert query
    const res = await client.query(insertQuery);
    console.log('Data inserted successfully:', res.rowCount, 'rows inserted.');

  } catch (error) {
    console.error('Error inserting data:', error);
  } finally {
    // Close the database connection
    await client.end();
    console.log('Database connection closed.');
  }
}

// Call the function to insert the data
insertProductVariantPrices();
