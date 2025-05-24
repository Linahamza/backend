//src/plugins/cron-tasks/tasks/promotion-check.task.ts
import { AppDataSource } from '../data-source';

/**
 * Extrait les IDs des productVariants à partir du champ JSON (string) conditions/actions
 */
function extractVariantIds(rawJson: string | null): number[] {
  const variantIds: number[] = [];

  if (!rawJson) return variantIds;

  try {
    const jsonArray = JSON.parse(rawJson);
    for (const item of jsonArray || []) {
      if (item.args) {
        for (const arg of item.args) {
          if (arg.name === 'productVariantIds') {
            let ids: any[] = [];

            if (typeof arg.value === 'string') {
              try {
                ids = JSON.parse(arg.value); // parse la chaîne comme un tableau JSON
              } catch (e) {
                console.warn('⚠️ Erreur JSON.parse sur arg.value:', arg.value);
              }
            } else if (Array.isArray(arg.value)) {
              ids = arg.value;
            }

            if (Array.isArray(ids)) {
              variantIds.push(...ids.map((id) => Number(id)));
            }
          }
        }
      }
    }
  } catch (e) {
    console.warn('❌ Erreur parsing JSON promo.conditions/actions:', rawJson);
  }

  return variantIds;
}

export async function runPromotionCheck() {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  const now = new Date();

  // 🔄 Récupère toutes les promotions 
  const promos = await AppDataSource.query(`
    SELECT id, "endsAt", conditions, actions, "enabled"
    FROM promotion
  `);

  // 🔍 Récupère le seuil global (par défaut = 5 si manquant)
  const thresholdQuery = await AppDataSource.query(`
    SELECT "outOfStockThreshold" FROM global_settings LIMIT 1
  `);
  const globalThreshold = thresholdQuery[0]?.outOfStockThreshold ?? 5;

  // Compteurs pour le nombre de promotions activées et désactivées
  let reactivatedCount = 0;
  let deactivatedCount = 0;

  for (const promo of promos) {
    let disable = false;

    // ⏰ Vérifie la date d’expiration
    if (promo.endsAt && new Date(promo.endsAt) < now) {
      //console.log(`📆 Promo ${promo.id} expirée`);
      disable = true;
    }

    // 📦 Vérifie le stock des productVariants ciblés
    const conditionIds = extractVariantIds(promo.conditions);
    const actionIds = extractVariantIds(promo.actions);
    const variantIds = Array.from(new Set([...conditionIds, ...actionIds]));

    //console.log(`🎯 Promo ${promo.id} concerne les variants:`, variantIds);

    if (variantIds.length > 0) {
      const stockRows = await AppDataSource.query(
        `
        SELECT pv.id, sl."stockOnHand", sl."stockAllocated",
               pv."trackInventory", pv."useGlobalOutOfStockThreshold"
        FROM product_variant pv
        JOIN stock_level sl ON pv.id = sl."productVariantId"
        WHERE pv.id = ANY($1)
        `,
        [variantIds]
      );

      const isStockCritique = stockRows.every((v: any) => {
        const seuil = v.useGlobalOutOfStockThreshold ? globalThreshold : 0;
        const disponible = v.stockOnHand - v.stockAllocated;
        return disponible <= seuil;
      });

      if (isStockCritique) {
        //console.log(`🚫 Promo ${promo.id} désactivée (stock critique)`);
        disable = true;
      }
    }

    // 🔧 Mise à jour finale
    if (disable && promo.enabled) {
      await AppDataSource.query(
        `UPDATE promotion SET enabled = false WHERE id = $1`,
        [promo.id]
      );
      deactivatedCount++;
    }
    

    if (!disable && !promo.enabled) {
      await AppDataSource.query(
        `UPDATE promotion SET enabled = true WHERE id = $1`,
        [promo.id]
      );
      //console.log(`♻️ Promo ${promo.id} réactivée automatiquement`);
      reactivatedCount++;
    }
  }

  // Affichage des résultats
  console.log(`\nRésumé des actions :`);
  console.log(`🎯 Promotions réactivées : ${reactivatedCount}`);
  console.log(`🎯 Promotions désactivées : ${deactivatedCount}`);
}
