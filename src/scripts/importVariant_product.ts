import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Connexion à PostgreSQL
const client = new Client({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function migrateEvolutionData() {
  try {
    await client.connect();
    console.log('✅ Connecté à PostgreSQL');

    // Démarrer une transaction
    await client.query('BEGIN');

    // Récupérer toutes les évolutions
    const evolutions = await client.query(`SELECT * FROM evolutions`);
    console.log(`📦 ${evolutions.rows.length} évolutions trouvées.`);

    for (const evolution of evolutions.rows) {
      const productId = evolution.product_id;
      const variantId = `${productId}-variant-${evolution.id}`; // Créer un ID unique pour chaque variante

      // Vérifier si la variante existe déjà pour ce produit
      const existingVariant = await client.query(
        `SELECT id FROM product_variant WHERE "productId" = $1 AND sku = $2`, // Utiliser des guillemets doubles pour "productId"
        [productId, variantId]
      );

      if (existingVariant.rows.length === 0) {
        console.log(`➡️ Insertion de la variante pour le produit ${productId} (Évolution ID: ${evolution.id})`);

        // Vérifier et définir la valeur pour customFieldsOn_discount
        // Convertir correctement le champ on_discount en booléen
        const isOnDiscount = evolution.on_discount === true || evolution.on_discount === 'true';

        // Insérer la nouvelle variante dans `product_variant`
        await client.query(
          `INSERT INTO product_variant (
            "createdAt", "updatedAt", "enabled", "sku", "productId", 
            "customFieldsAvailability", "customFieldsEvolution_parsing_date", 
            "customFieldsCertification", "customFieldsFormat", "customFieldsIngredients", 
            "customFieldsIngredients_clean", "customFieldsOn_discount", 
            "customFieldsPrice_per_packaging", "customFieldsPrice_per_unit", 
            "customFieldsWeight_per_packaging"
          ) VALUES (
            NOW(), NOW(), TRUE, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
          )`,
          [
            variantId, // SKU unique
            productId,
            evolution.availability || false, // customFieldsAvailability (valeur booléenne)
            evolution.evolution_parsing_date || "", // customFieldsEvolution_parsing_date
            evolution.certification || "", // customFieldsCertification
            evolution.format || "", // customFieldsFormat
            evolution.ingredients || "", // customFieldsIngredients
            evolution.ingredients_clean || "", // customFieldsIngredients_clean
            isOnDiscount, // customFieldsOn_discount (valeur booléenne corrigée)
            evolution.price_per_packaging || 0, // customFieldsPrice_per_packaging
            evolution.price_per_unit || 0, // customFieldsPrice_per_unit
            evolution.weight_per_packaging || 0 // customFieldsWeight_per_packaging
          ]
        );

        console.log(`✅ Variante pour produit ${productId} insérée avec succès.`);
      } else {
        console.log(`⚠️ Variante pour le produit ${productId} (Évolution ID: ${evolution.id}) déjà existante.`);
      }
    }

    // Commit de la transaction
    await client.query('COMMIT');
    console.log("🎉 Migration des évolutions terminée !");
  } catch (err) {
    // Rollback en cas d'erreur
    await client.query('ROLLBACK');
    console.error("❌ Erreur lors de la migration :", err);
  } finally {
    await client.end();
    console.log("🔌 Connexion fermée.");
  }
}

// Exécuter la migration des évolutions
migrateEvolutionData();
