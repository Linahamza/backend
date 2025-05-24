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

function cleanSlug(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase();
}

async function importCategoriesWithHierarchy() {
  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL');

    await client.query('BEGIN');
    console.log('🚀 Transaction started');

    const categoriesRes = await client.query(`SELECT category_id, label, parent_id FROM categories_carrefour`);
    const categories = categoriesRes.rows;

    for (const category of categories) {
      const categoryId = Number(category.category_id);
      const parentId = category.parent_id ? Number(category.parent_id) : null;
      const label = category.label;
      const cleanedSlug = cleanSlug(label);
      const isRoot = !parentId;

      const check = await client.query(`SELECT id FROM collection WHERE id = $1`, [categoryId]);
      if (check.rows.length === 0) {
        await client.query(`
          INSERT INTO collection (
            id, "createdAt", "updatedAt", "isRoot", "position", "isPrivate", "filters", "inheritFilters"
          ) VALUES (
            $1, NOW(), NOW(), $2, 
            (SELECT COALESCE(MAX(position), 0) + 1 FROM collection), 
            false, '[]'::jsonb, false
          )
        `, [categoryId, isRoot]);
        console.log(`✅ Collection created: ${label}`);

        // ✅ Liaison immédiate au channel 1
        await client.query(
          `INSERT INTO collection_channels_channel ("collectionId", "channelId") VALUES ($1, 1)`,
          [categoryId]
        );
        console.log(`🌐 Collection liée au channel 1: ${label}`);
      }

      const transCheck = await client.query(
        `SELECT * FROM collection_translation WHERE "baseId" = $1 AND "languageCode" = 'fr'`,
        [categoryId]
      );
      if (transCheck.rows.length === 0) {
        await client.query(`
          INSERT INTO collection_translation (
            "createdAt", "updatedAt", "languageCode", "name", "slug", "description", "baseId"
          ) VALUES (
            NOW(), NOW(), 'fr', $1, $2, '', $3
          )
        `, [label, cleanedSlug, categoryId]);
        console.log(`🌍 Translation added for: ${label}`);
      }
    }

    for (const category of categories) {
      const categoryId = Number(category.category_id);
      const parentId = category.parent_id ? Number(category.parent_id) : null;
    
      if (parentId) {
        // Mettre à jour la collection en associant le parent
        await client.query(`
          UPDATE collection
          SET "parentId" = $1,
              "customFieldsCategorie_parent" = (
                SELECT label FROM categories_carrefour WHERE category_id = $2
              )::text,
              "isRoot" = false
          WHERE id = $3
        `, [parentId, String(parentId), categoryId]);
        console.log(`🔗 Parent set for category ${categoryId} → ${parentId}`);
    
        // Insérer dans collection_closure (relation parent → enfant)
        await client.query(`
          INSERT INTO collection_closure (id_ancestor, id_descendant)
          VALUES ($1, $2)
        `, [parentId, categoryId]);
    
        // Insérer les relations pour tous les ancêtres du parent
        let currentParentId = parentId;
        while (currentParentId) {
          const parentRes = await client.query(`
            SELECT "parentId" FROM collection WHERE id = $1
          `, [currentParentId]);
          const parent = parentRes.rows[0];
          
          if (parent && parent.parentId) {
            currentParentId = parent.parentId;
            await client.query(`
              INSERT INTO collection_closure (id_ancestor, id_descendant)
              VALUES ($1, $2)
            `, [currentParentId, categoryId]);
          } else {
            break; // Sortir de la boucle si on atteint une racine
          }
        }
      } else {
        // Si parentId est NULL, cela signifie que la catégorie est une racine, on ne fait rien pour la collection_closure
        console.log(`🪴 Catégorie racine détectée : ${categoryId}`);
      }
    }
    // Associations entre les produits et les collections
    await client.query(`
  INSERT INTO collection_product_variants_product_variant ("productVariantId", "collectionId")
   SELECT DISTINCT
        pv.id AS "productVariantId",
        pc.category_id AS "collectionId"
    FROM product_categories pc
    JOIN products prod ON prod.id = pc.product_id
    JOIN product p ON p."customFieldsSource_id" = prod.id
               AND p."customFieldsEan" = prod.ean
    JOIN product_variant pv ON pv."productId" = p.id
    WHERE pc.category_id IN (SELECT id FROM collection)
      AND pc.category_id IS NOT NULL  -- Assure que la catégorie existe bien
    ON CONFLICT ("productVariantId", "collectionId") DO NOTHING;


          
        `);


    console.log(`🔗 ProductVariant ↔ Category associations created`);

    // Sécurité : lier toute collection non encore liée
    await client.query(`
      INSERT INTO collection_channels_channel ("collectionId", "channelId")
      SELECT id, 1
      FROM collection
      WHERE id NOT IN (
        SELECT "collectionId" FROM collection_channels_channel WHERE "channelId" = 1
      )
    `);
    console.log(`🌐 Toutes les collections sont liées au channel par défaut (id = 1)`);

    await client.query('COMMIT');
    console.log('🎉 Importation terminée avec hiérarchie complète !');
  } catch (err) {
    console.error('❌ Error during import:', err);
    await client.query('ROLLBACK');
    console.log('↩️ Transaction annulée');
  } finally {
    await client.end();
    console.log('🔌 Connection closed');
  }
}

importCategoriesWithHierarchy();
