import { Client } from "pg";
import axios from "axios";
import * as dotenv from "dotenv";

dotenv.config();

// 1. Configuration
const DB_CONFIG = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

const TRANSLATE_CONFIG = {
  url: "http://localhost:5005/translate",
  batchSize: 3,
  delayBetweenRequests: 1000,
  delayBetweenBatches: 1000,
  extraDelayBetweenBatches: 3000,
  productsBeforeLongPause: 1000,
  longPauseDuration: 60000,
  timeout: 10000,
  maxRetries: 3
};

// 2. Interface
interface Variant {
  id: number;
  baseId: number;
  name: string;
}

// 3. Utils
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
async function processVariants() {
  const client = new Client(DB_CONFIG);
  await client.connect();

  try {
    console.log("🔍 Chargement des variants à traduire...");
    const { rows: variants } = await client.query<Variant>(`
      SELECT pvt."id", pvt."baseId", pvt."name"
      FROM product_variant_translation pvt
      LEFT JOIN product_variant_translation pvt_en
        ON pvt."baseId" = pvt_en."baseId" AND pvt_en."languageCode" = 'en'
      WHERE pvt."languageCode" = 'fr'
        AND pvt_en."id" IS NULL
      ORDER BY LENGTH(pvt."name") ASC
    `);

    console.log(`📦 ${variants.length} variants à traduire`);

    let totalTranslated = 0;

    for (let i = 0; i < variants.length; i += TRANSLATE_CONFIG.batchSize) {
      const batch = variants.slice(i, i + TRANSLATE_CONFIG.batchSize);
      const batchStartTime = Date.now();

      const translationPromises = batch.map(async (variant, index) => {
        const name = await translateWithRetry(variant.name);
        console.log(`✅ Variant ${variant.baseId} traduit (${i + index + 1}/${variants.length})`);
        totalTranslated++;
        await delay(TRANSLATE_CONFIG.delayBetweenRequests);
        return name;
      });

      const results = await Promise.allSettled(translationPromises);

      for (let j = 0; j < results.length; j++) {
        const result = results[j];
        const originalName = batch[j].name;

        if (result.status === "fulfilled") {
          let name = result.value;

          // ⚠️ On vérifie si la traduction est vide ou identique à l'original
          if (!name || name.trim() === originalName.trim()) {
            console.warn(`⚠️ Traduction vide ou identique pour le variant ${batch[j].baseId}. On copie le texte FR.`);
            name = originalName;
          }

          await client.query(
            `INSERT INTO product_variant_translation
             ("languageCode", "name", "baseId", "createdAt", "updatedAt")
             VALUES ($1, $2, $3, now(), now())`,
            ['en', name, batch[j].baseId]
          );
        } else {
          console.error(`❌ Échec de traduction pour le variant ${batch[j].baseId}:`, result.reason);
          // ⚠️ Aucun changement dans la base : la version française reste seule
        }
      }

      const batchDuration = Date.now() - batchStartTime;
      const remainingDelay = Math.max(
        TRANSLATE_CONFIG.delayBetweenBatches - batchDuration,
        0
      );
      await delay(remainingDelay);

      if (i > 0 && i % TRANSLATE_CONFIG.productsBeforeLongPause === 0) {
        console.log(`⏸️ Pause après ${i} variants...`);
        await delay(TRANSLATE_CONFIG.longPauseDuration);
      }
    }

    console.log("✅ Traduction terminée !");
    console.log(`📊 Total variants traduits : ${totalTranslated}`);
  } catch (error) {
    console.error("❌ Erreur critique:", error instanceof Error ? error.message : error);
  } finally {
    await client.end();
  }
}

// 6. Lancement
processVariants()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("💥 Erreur non gérée:", error);
    process.exit(1);
  });
