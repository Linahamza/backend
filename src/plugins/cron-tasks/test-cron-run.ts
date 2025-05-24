//src\plugins\cron-tasks\test-cron-run.ts
import { runStockCheck } from './tasks/stock-check.task';
import { runPromotionCheck } from './tasks/promotion-check.task';

(async () => {
  console.log('🧪 Lancement manuel des tâches cron');
  console.log('\n=== TEST STOCK ===');
  await runStockCheck();
  console.log('\n=== TEST PROMOTIONS ===');
  await runPromotionCheck();
})();

