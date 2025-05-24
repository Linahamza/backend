//src\plugins\test-customer-google-token.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import fetch from 'node-fetch';

@Controller('auth-customer')
export class TestCustomerGoogleAuthController {
  @Post('test-google-token')
  async testToken(@Body() body: { access_token: string }) {
    const token = body.access_token;

    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Token invalide');
      }

      const userInfo = await res.json();

      return {
        status: 'success',
        userInfo,
      };
    } catch (e) {
      return {
        status: 'error',
        message: e instanceof Error ? e.message : 'Erreur inconnue',
      };
    }
  }
}
