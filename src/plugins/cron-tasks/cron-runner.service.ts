/*src\plugins\cron-tasks\cron-runner.service.ts
Ce fichier utilise node-cron pour planifier l’exécution automatique de tâches
 (comme vérifier le stock ou désactiver des promotions).
*/ 
import { Injectable } from '@nestjs/common';
import cron from 'node-cron';
import { runStockCheck } from './tasks/stock-check.task';
import { runPromotionCheck } from './tasks/promotion-check.task';

@Injectable()
export class CronRunnerService {
  onApplicationBootstrap() {
    console.log('🚀 CronRunnerService démarré');

    // Toutes les 2 Jours : vérifier les stocks
    cron.schedule('0 0 */2 * *', () => {

      console.log(`🕑 Tâche runStockCheck() exécutée à ${new Date().toISOString()}`);
      runStockCheck();
    });

    // Toutes les 2 Jours : désactiver les promotions expirées
    cron.schedule('0 0 */2 * *', () => {
      console.log(`🕑 Tâche runPromotionCheck() exécutée à ${new Date().toISOString()}`);
      runPromotionCheck();
    });
  }
}
