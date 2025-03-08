import { Client } from 'pg';
import * as dotenv from 'dotenv';

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
    console.log('✅ Connexion réussie à PostgreSQL.');

    await client.query('BEGIN');

    // 🔄 Insérer les produits avec les informations du marché et EAN
    const insertProductQuery = `
      INSERT INTO "product" (
        "id", "createdAt", "updatedAt", "enabled", 
        "customFieldsMeasure_unit_for_packaging", "customFieldsMeasure_unit_for_priceperunit", 
        "customFieldsPackaging", "customFieldsMatter", "customFieldsParsing_duration", 
        "customFieldsBrand_id", "customFieldsBrand_name", 
        "customFieldsOrigin_id", "customFieldsOrigin_country",
        "customFieldsMarket_id", "customFieldsMarket_name", "customFieldsMarket_address",
        "customFieldsEan"
      )
      SELECT 
        p."id", p."created_at", p."updated_at", true, 
        p."mesure_unit_for_packaging", p."mesure_unit_for_price_per_unit", 
        p."packaging", p."matter", p."parsing_duration", 
        p."brand_id", b."name" AS "brand_name", o."id" AS "origin_id", o."origin_country",
        m."id" AS "market_id", m."name" AS "market_name", m."address" AS "market_address",
        p."ean"
      FROM "products" p
      LEFT JOIN "brands" b ON p."brand_id" = b."id"
      LEFT JOIN "origin" o ON p."id" = o."product_id"
      LEFT JOIN "product_markets" pm ON p."id" = pm."product_id"
      LEFT JOIN "markets" m ON pm."market_id" = m."id"
      WHERE p."id" IS NOT NULL
      ON CONFLICT ("id") DO NOTHING;
    `;
    await client.query(insertProductQuery);
    console.log('📌 Produits insérés avec les marchés et EAN.');

    // 🔄 Insérer les variantes de produits
    const insertProductVariantQuery = `
      INSERT INTO "product_variant" (
        "id", "createdAt", "updatedAt", "enabled", 
        "productId", "sku", "customFieldsAvailability", 
        "customFieldsCertification", "customFieldsFormat", 
        "customFieldsOn_discount", "customFieldsPrice_per_unit", 
        "customFieldsPrice_per_packaging", "customFieldsWeight_per_packaging", 
        "customFieldsEvolution_parsing_date", "customFieldsIngredients", 
        "customFieldsIngredients_clean"
      )
      SELECT 
        e."id", NOW(), NOW(), true, e."product_id", 
        CONCAT('SKU-', e."product_id", '-', e."id"),
        e."availability", e."certification", e."format", 
        e."on_discount", e."price_per_unit", e."price_per_packaging", 
        e."weight_per_packaging", e."evolution_parsing_date", e."ingredients", e."ingredients_clean"
      FROM "evolutions" e
      WHERE e."product_id" IS NOT NULL AND e."id" IS NOT NULL
      ON CONFLICT ("id") DO NOTHING;
    `;
    await client.query(insertProductVariantQuery);
    console.log('📌 Variantes de produit insérées.');


    // 🥗 Mettre à jour les données nutritionnelles
    const updateNutritionQuery = `
      UPDATE "product_variant" pv
      SET 
        "customFieldsCarbohydrates" = n."carbohydrates",
        "customFieldsSugars" = n."sugars",
        "customFieldsKcal" = n."kcal",
        "customFieldsKj" = n."kj",
        "customFieldsFats" = n."fats",
        "customFieldsSaturates" = n."saturates",
        "customFieldsProteins" = n."proteins",
        "customFieldsCalcium" = n."calcium",
        "customFieldsIodine" = n."iodine",
        "customFieldsIron" = n."iron",
        "customFieldsSalt" = n."salt",
        "customFieldsSodium" = n."sodium",
        "customFieldsZinc" = n."zinc",
        "customFieldsVitamin_a" = n."vitamin_a",
        "customFieldsVitamin_b1" = n."vitamin_b1",
        "customFieldsVitamin_c" = n."vitamin_c",
        "customFieldsVitamin_d" = n."vitamin_d"
      FROM "nutrition" n
      WHERE pv."id" = n."evolution_id";
    `;
    await client.query(updateNutritionQuery);
    console.log('🥗 Données nutritionnelles mises à jour.');

    await client.query('COMMIT');
    console.log('🚀 Migration terminée avec succès !');

  } catch (error) {
    console.error('❌ Erreur lors de la migration :', error);
    await client.query('ROLLBACK');
    console.log('🔄 ROLLBACK effectué.');
  } finally {
    await client.end();
    console.log('🔌 Connexion fermée.');
  }
}

// Exécuter la migration
migrateData();
