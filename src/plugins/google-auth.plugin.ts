// src/plugins/google-auth.plugin.ts
import { VendurePlugin, PluginCommonModule } from '@vendure/core';
import { Module } from '@nestjs/common';
import { GoogleAuthTestController } from './google-admin-auth-test.controller'; // Le contrôleur pour tester le token

@VendurePlugin({
  imports: [PluginCommonModule], // Le module de base de Vendure
  controllers: [GoogleAuthTestController], // Ajout du contrôleur pour les requêtes liées à Google Auth
  compatibility: '^3.2.2', // Compatibilité avec ta version de Vendure
})
export class GoogleAuthPlugin {}
