import { Client } from "pg";
import axios from "axios";
import * as dotenv from "dotenv";

dotenv.config();

// 1. Configuration optimisée
const DB_CONFIG = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

const TRANSLATE_CONFIG = {
  url: "http://localhost:5005/translate",
  batchSize: 3,                        // Nombre de produits traités simultanément (dans un "batch")
  delayBetweenRequests: 1000,         // Délai (en ms) entre deux requêtes de traduction d'un même batch (1 seconde ici)
  delayBetweenBatches: 500,           // Délai (en ms) entre la fin d’un batch et le début du suivant (0.5 seconde ici)
  extraDelayBetweenBatches: 1000,     // Délai supplémentaire après chaque batch, utile si l’API est fragile ou capricieuse
  productsBeforeLongPause: 1000,      // Nombre total de produits à traiter avant de faire une pause plus longue (pour ménager l’API)
  longPauseDuration: 60000,           // Durée (en ms) de la pause longue (ici, 1 minute)
  timeout: 10000,                     // Timeout maximum (en ms) pour chaque requête HTTP vers l’API de traduction (ici, 10 secondes)
  maxRetries: 3                       // Nombre maximal de tentatives si une traduction échoue (avec délai croissant entre les essais)

};

// 2. Interface pour le typage
interface Product {
  id: number;
  baseId: number;
  name: string;
  description: string;
  slug: string;
}

// 3. Fonctions utilitaires
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const escapeSql = (text: string) => text.replace(/'/g, "''");

// 4. Traduction avec retry
async function translateWithRetry(
  text: string,
  targetLang: string = "en",
  attempt: number = 1
): Promise<string> {
  try {
    const response = await axios.post(
      TRANSLATE_CONFIG.url,
      {
        q: text,
        source: "fr",
        target: targetLang,
        format: "text"
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: TRANSLATE_CONFIG.timeout
      }
    );
    return response.data.translatedText;
  } catch (error) {
    if (attempt >= TRANSLATE_CONFIG.maxRetries) {
      console.error(`❌ Échec final (${attempt} tentatives) pour: "${text.substring(0, 30)}..."`);
      return text;
    }

    const waitTime = attempt * 2000;
    console.warn(`⚠️ Tentative ${attempt}/${TRANSLATE_CONFIG.maxRetries}. Nouvel essai dans ${waitTime}ms...`);
    await delay(waitTime);
    return translateWithRetry(text, targetLang, attempt + 1);
  }
}

// 5. Fonction principale
async function processProducts() {
  const client = new Client(DB_CONFIG);
  await client.connect();

  try {
    console.log("🔍 Chargement des produits...");
    const { rows: products } = await client.query<Product>(`
      SELECT fr."id", fr."baseId", fr."name", fr."description", fr."slug"
      FROM product_translation fr
      WHERE fr."languageCode" = 'fr'
      AND NOT EXISTS (
      SELECT 1 FROM product_translation en
      WHERE en."languageCode" = 'en'
        AND en."baseId" = fr."baseId"
    )
  ORDER BY LENGTH(fr."name") ASC, LENGTH(fr."description") ASC
    `);

    console.log(`📊 Total: ${products.length} produits à traduire`);

    let totalTranslated = 0;

    for (let i = 0; i < products.length; i += TRANSLATE_CONFIG.batchSize) {
      const batch = products.slice(i, i + TRANSLATE_CONFIG.batchSize);
      const batchStartTime = Date.now();

      const translationPromises = batch.map(async (product, index) => {
        const name = await translateWithRetry(product.name);
        await delay(TRANSLATE_CONFIG.delayBetweenRequests);

        const description = await translateWithRetry(product.description);
        await delay(TRANSLATE_CONFIG.delayBetweenRequests);

        const slug = await translateWithRetry(product.slug);

        console.log(`✅ Produit ${product.baseId} traduit (${i + index + 1}/${products.length})`);
        totalTranslated++;
        return [name, description, slug];
      });

      const results = await Promise.allSettled(translationPromises);

      for (let j = 0; j < results.length; j++) {
        const result = results[j];
        const product = batch[j];

        if (result.status === "fulfilled" && Array.isArray(result.value)) {
          const [name, description, slug] = result.value;
          await client.query(
            `INSERT INTO product_translation
             ("languageCode", "name", "description", "slug", "baseId")
             VALUES ($1, $2, $3, $4, $5)`,
            ['en', name, description, slug, product.baseId]
          );
        } else if (result.status === "rejected") {
          console.error(`❌ Échec de traduction pour le produit ${product.baseId}:`, result.reason);
        }
      }

      const batchDuration = Date.now() - batchStartTime;
      const remainingDelay = Math.max(TRANSLATE_CONFIG.delayBetweenBatches - batchDuration, 0);
      await delay(remainingDelay);

      if (i > 0 && i % TRANSLATE_CONFIG.productsBeforeLongPause === 0) {
        console.log(`⏸️ Pause après ${i} produits...`);
        await delay(TRANSLATE_CONFIG.longPauseDuration);
      }

      await delay(TRANSLATE_CONFIG.extraDelayBetweenBatches);
    }

    console.log("✅ Traduction terminée avec succès !");
    console.log(`📊 Nombre total de produits traduits : ${totalTranslated}`);

  } catch (error) {
    console.error("❌ Erreur critique:", error instanceof Error ? error.message : error);
  } finally {
    await client.end();
  }
}

// 6. Exécution
processProducts()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("💥 Erreur non gérée:", error);
    process.exit(1);
  });
