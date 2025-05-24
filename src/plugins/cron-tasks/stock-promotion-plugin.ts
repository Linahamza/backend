/*src\plugins\cron-tasks\stock-promotion-plugin.ts
C’est un plugin personnalisé pour Vendure qui enregistre et active 
le service CronRunnerService au démarrage*/

import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { Module } from '@nestjs/common';
import { CronRunnerService } from './cron-runner.service';

@VendurePlugin({
  imports: [PluginCommonModule],
  compatibility: '^3.2.2', // adapte à ta version
  providers: [CronRunnerService],
})
export class StockPromotionPlugin {}
