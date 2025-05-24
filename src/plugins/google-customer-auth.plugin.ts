//src\plugins\google-customer-auth.plugin.ts
import { VendurePlugin, PluginCommonModule } from '@vendure/core';
import { Module } from '@nestjs/common';
import { GoogleCustomerAuthStrategy } from '../config/auth/google-customer-auth.strategy';
import { TestCustomerGoogleAuthController } from './test-customer-google-token.controller';

@VendurePlugin({
  imports: [PluginCommonModule],
  providers: [GoogleCustomerAuthStrategy],
  controllers: [TestCustomerGoogleAuthController],
  compatibility: '^3.2.2',
})
export class GoogleCustomerAuthPlugin {}
