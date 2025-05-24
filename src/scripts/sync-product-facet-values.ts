import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function main() {
  console.log('🚀 Starting insertion script with transaction support...');

  await client.connect();
  console.log('✅ Connected to database.');

  try {
    // 👉 Début de la transaction
    await client.query('BEGIN');
    console.log('🔐 Transaction started.');

    // 🔗 Insertion des facet values pour les produits
    const insertProductFacetValues = `
      WITH to_insert AS (
        SELECT p.id AS product_id, fvt.id AS facet_value_id
        FROM product p
        JOIN facet_value_translation fvt ON p."customFieldsBrand_name" = fvt.name
        WHERE NOT EXISTS (
          SELECT 1 FROM product_facet_values_facet_value pfv
          WHERE pfv."productId" = p.id AND pfv."facetValueId" = fvt.id
        )
        -- Assurez-vous que les facet_value_id existent dans la table facet_value
        AND EXISTS (
          SELECT 1 FROM facet_value fv WHERE fv.id = fvt.id
        )
      )
      INSERT INTO product_facet_values_facet_value ("productId", "facetValueId")
      SELECT product_id, facet_value_id FROM to_insert
      RETURNING *;
    `;

    const res1 = await client.query(insertProductFacetValues);
    console.log(`✅ ${res1.rowCount} product(s) linked to facet values.`);

    // 🔗 Insertion des facet values pour les variantes
    const insertVariantFacetValues = `
      WITH to_insert AS (
        SELECT pv.id AS variant_id, fvt.id AS facet_value_id
        FROM product_variant pv
        JOIN product p ON pv."productId" = p.id
        JOIN facet_value_translation fvt ON p."customFieldsBrand_name" = fvt.name
        WHERE NOT EXISTS (
          SELECT 1 FROM product_variant_facet_values_facet_value pvfv
          WHERE pvfv."productVariantId" = pv.id AND pvfv."facetValueId" = fvt.id
        )
        -- Assurez-vous que les facet_value_id existent dans la table facet_value
        AND EXISTS (
          SELECT 1 FROM facet_value fv WHERE fv.id = fvt.id
        )
      )
      INSERT INTO product_variant_facet_values_facet_value ("productVariantId", "facetValueId")
      SELECT variant_id, facet_value_id FROM to_insert
      RETURNING *;
    `;

    const res2 = await client.query(insertVariantFacetValues);
    console.log(`✅ ${res2.rowCount} variant(s) linked to facet values.`);

    // ✅ Tout s’est bien passé, on valide la transaction
    await client.query('COMMIT');
    console.log('💾 Transaction committed successfully!');
  } catch (err) {
    // ❌ En cas d’erreur, rollback
    await client.query('ROLLBACK');
    console.error('🚨 Error occurred, transaction rolled back:', err);
  } finally {
    await client.end();
    console.log('🔌 Connection closed.');
  }

  console.log('🎉 Script execution completed.');
}

main();
