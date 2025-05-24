import { AppDataSource } from '../data-source';

export async function runStockCheck() {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  // Récupérer le seuil global
  const thresholdQuery = await AppDataSource.query(`
    SELECT "outOfStockThreshold" FROM global_settings LIMIT 1
  `);

  const globalThreshold = thresholdQuery[0]?.outOfStockThreshold ?? 5;

  // Récupérer les variantes concernées par le tracking global
  const variants = await AppDataSource.query(`
    SELECT
      pv.id AS variant_id,
      sl."stockOnHand",
      sl."stockAllocated",
      pv."enabled"
    FROM product_variant pv
    JOIN stock_level sl ON pv.id = sl."productVariantId"
    WHERE
      pv."trackInventory" IN ('INHERIT', 'TRUE')
      AND pv."useGlobalOutOfStockThreshold" = true
  `);

  // Compteurs pour réactiver et désactiver les variantes
  let reactivatedCount = 0;
  let deactivatedCount = 0;

  for (const v of variants) {
    const available = v.stockOnHand - v.stockAllocated;

    // Désactivation automatique si le stock est critique
    if (available <= globalThreshold && v.enabled) {
      await AppDataSource.query(
        `UPDATE product_variant SET enabled = false WHERE id = $1`,
        [v.variant_id]
      );
      console.log(`🛑 ProductVariant ${v.variant_id} désactivé automatiquement (stock critique)`);
      deactivatedCount++;
    }

    // Réactivation automatique si le stock dépasse le seuil
    else if (available > globalThreshold && !v.enabled) {
      await AppDataSource.query(
        `UPDATE product_variant SET enabled = true WHERE id = $1`,
        [v.variant_id]
      );
      console.log(`♻️ ProductVariant ${v.variant_id} réactivé automatiquement (stock suffisant)`);
      reactivatedCount++;
    }
  }

  // Résumé des actions
  console.log(`\nRésumé des actions :`);
  console.log(`🎯 Variantes réactivées : ${reactivatedCount}`);
  console.log(`🎯 Variantes désactivées : ${deactivatedCount}`);
}
