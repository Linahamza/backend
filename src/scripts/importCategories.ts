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

// Fonction pour nettoyer le slug (supprimer les accents et les caractères spéciaux)
function cleanSlug(text: string): string {
  return text
    .normalize('NFD') // Décompose les caractères accentués
    .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
    .replace(/[^a-zA-Z0-9 -]/g, '') // Supprime les caractères spéciaux
    .replace(/\s+/g, '-') // Remplace les espaces par des tirets
    .toLowerCase(); // Convertit en minuscules
}

async function importCategories() {
  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL');

    // Vérifier si la catégorie racine avec ID 1000 existe déjà
    const rootCheck = await client.query(`SELECT id FROM "collection" WHERE "id" = 1000`);
    let rootId: number;

    if (rootCheck.rows.length === 0) {
      // Si la catégorie racine n'existe pas, l'ajouter
      const rootInsert = await client.query(
        `INSERT INTO "collection" ("id", "createdAt", "updatedAt", "isRoot", "position", "isPrivate", "filters", "inheritFilters") 
         VALUES (1000, NOW(), NOW(), true, 0, false, '', false)
         RETURNING id`
      );
      rootId = rootInsert.rows[0].id;
      console.log(`✅ Root category created with ID: ${rootId}`);
    } else {
      rootId = rootCheck.rows[0].id;
      console.log(`✅ Root category already exists with ID: ${rootId}`);
    }

    // Insérer la traduction de la catégorie racine
    const translationCheck = await client.query(
      `SELECT * FROM "collection_translation" WHERE "baseId" = $1 AND "languageCode" = 'en'`,
      [rootId]
    );
    
    if (translationCheck.rows.length === 0) {
      await client.query(
        `INSERT INTO "collection_translation" ("createdAt", "updatedAt", "languageCode", "name", "slug", "description", "baseId")
         VALUES (NOW(), NOW(), 'en', 'Root Categories', 'root-categories', '', $1)`,
        [rootId]
      );
      console.log('✅ Root category translation added');
    } else {
      console.log('⚠️ Translation for root category already exists');
    }

    // Insérer les sous-catégories et les lier au parentId = 1000 (racine)
    const categoriesRes = await client.query('SELECT id, label FROM "categories"');

    for (const row of categoriesRes.rows) {
      const { id, label } = row;

      // Insérer la sous-catégorie dans la table "collection" en attribuant parentId = rootId (1000)
      const insertCollectionQuery = `
        INSERT INTO "collection" ("id", "createdAt", "updatedAt", "isRoot", "position", "isPrivate", "filters", "inheritFilters", "parentId")
        VALUES ($1, NOW(), NOW(), false, (SELECT COALESCE(MAX("position"), 0) + 1 FROM "collection"), false, '', false, $2)
        ON CONFLICT ("id") DO NOTHING;
      `;

      const result = await client.query(insertCollectionQuery, [id, rootId]);
      if (result.rowCount === 0) {
        console.log(`⚠️ Category ID: ${id} already exists in collection`);
      }

      // Nettoyer le label pour générer un slug valide
      const cleanedSlug = cleanSlug(label);

      // Vérifier si la traduction existe déjà
      const translationCheckQuery = `
        SELECT * FROM "collection_translation" WHERE "baseId" = $1 AND "languageCode" = 'en'
      `;
      const translationCheckResult = await client.query(translationCheckQuery, [id]);

      if (translationCheckResult.rows.length === 0) {
        // Insérer la traduction en anglais pour chaque sous-catégorie
        const insertTranslationQuery = `
          INSERT INTO "collection_translation" ("createdAt", "updatedAt", "languageCode", "name", "slug", "description", "baseId")
          VALUES (NOW(), NOW(), 'en', $1, $2::varchar, '', $3)
        `;
        console.log(`Inserting translation for category: ${label}, baseId: ${id}, slug: ${cleanedSlug}`);
        const translationResult = await client.query(insertTranslationQuery, [label, cleanedSlug, id]);
        console.log(`✅ Translation inserted for baseId: ${id}`);
      } else {
        console.log(`⚠️ Translation already exists for baseId: ${id}`);
      }
    }

    console.log('🎉 Import completed successfully!');
  } catch (err) {
    console.error('❌ Error importing categories:', err);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

// Exécuter la fonction d'importation
importCategories();
