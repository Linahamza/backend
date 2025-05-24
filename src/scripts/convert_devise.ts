import { Client } from "pg";
import axios from "axios";
import * as dotenv from "dotenv";

dotenv.config();

// 📌 Configuration PostgreSQL
const client = new Client({
  host: process.env.DB_HOST ,
  port: Number(process.env.DB_PORT) ,
  user: process.env.DB_USERNAME ,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME ,
});

// 📌 Configuration des devises
const TARGET_CURRENCIES = ["USD"];
const CURRENCY_API_KEY = process.env.CURRENCY_API_KEY ;

// 📌 Délai entre les batchs
const DELAY_BETWEEN_BATCHES = 3000; // 3 secondes entre chaque batch de 100
const DELAY_BETWEEN_PRODUCTS = 300; // 300ms entre chaque produit

// 📌 Fonction pour récupérer le taux de conversion
async function getExchangeRate(from: string, to: string): Promise<number> {
  try {
    const response = await axios.get(
      `https://v6.exchangerate-api.com/v6/${CURRENCY_API_KEY}/latest/${from}`
    );
    const rate = response.data.conversion_rates[to] || 1;
    return rate;
  } catch (error) {
    console.error(`❌ Erreur récupération taux de conversion ${from} → ${to}:`, error);
    return 1;
  }
}

// 📌 Fonction pour récupérer un batch de produits en EUR sans USD
async function getProductsWithoutUSD(batchSize: number): Promise<any[]> {
  // Récupérer les produits en EUR sans prix en USD
  const products = await client.query(
    `SELECT "id", "price", "currencyCode", "variantId"
     FROM "product_variant_price"
     WHERE "currencyCode" = 'EUR' AND "variantId" NOT IN (
       SELECT "variantId" FROM "product_variant_price" WHERE "currencyCode" = 'USD'
     )
     LIMIT $1`, [batchSize]
  );
  return products.rows;
}

// 📌 Fonction principale
async function main() {
  await client.connect();

  try {
    console.log("🔍 Début de la conversion des prix...");

    let productsWithoutUSD = await getProductsWithoutUSD(1500);

    if (productsWithoutUSD.length === 0) {
      // Si aucun produit à traiter, on s'arrête
      console.log("✅ Tous les produits ont déjà un prix en USD. Aucune conversion nécessaire.");
      return;
    }

    console.log(`💰 Conversion des prix EUR → USD pour ${productsWithoutUSD.length} produits...`);
    const rate = await getExchangeRate("EUR", "USD");

    while (productsWithoutUSD.length > 0) {
      for (let i = 0; i < productsWithoutUSD.length; i++) {
        const p = productsWithoutUSD[i];
        const convertedPrice = Math.round(p.price * rate);

        try {
          // Insérer ou mettre à jour le prix en USD
          await client.query(
            `INSERT INTO "product_variant_price" ("currencyCode", "price", "variantId")
             VALUES ($1, $2, $3)
             ON CONFLICT ("currencyCode", "variantId") DO UPDATE 
             SET "price" = EXCLUDED."price"`,
            ["USD", convertedPrice, p.variantId]
          );

          // ✅ Log stylé ici :
          console.log(
            `✅ [${String(i + 1).padStart(4, ' ')} / ${productsWithoutUSD.length}] Prix ${String(p.price).padEnd(6, ' ')} EUR → ${String(convertedPrice).padEnd(6, ' ')} USD`
          );
        } catch (err) {
          console.error(`❌ Erreur insertion prix pour variantId ${p.variantId}:`, err);
        }

        // ⏱️ Pause entre chaque requête
        await delay(DELAY_BETWEEN_PRODUCTS);

        // ⏳ Pause après chaque batch de 100 produits
        if ((i + 1) % 100 === 0) {
          console.log(`⏳ Attente de ${DELAY_BETWEEN_BATCHES / 1000}s après ${i + 1} produits traités...`);
          await delay(DELAY_BETWEEN_BATCHES);
        }
      }

      // 📌 Récupérer un nouveau batch de produits non convertis
      productsWithoutUSD = await getProductsWithoutUSD(1500);

      // Si plus aucun produit à traiter, on arrête le script
      if (productsWithoutUSD.length === 0) {
        console.log("✅ Tous les produits ont maintenant un prix en USD. Conversion terminée.");
        break;
      }

      console.log(`💰 Conversion des prix EUR → USD pour ${productsWithoutUSD.length} produits restants...`);
    }

  } catch (error) {
    console.error("❌ Erreur :", error);
  } finally {
    await client.end();
  }
}

// 📌 Fonction pour ajouter un délai
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// 📌 Exécuter le script
main();
