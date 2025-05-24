// src/plugins/google-auth-test.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { Client } from 'pg'; // Import du client PostgreSQL

@Controller('auth')
export class GoogleAuthTestController {

  // Crée une instance du client PostgreSQL
  private client: Client;

  constructor() {
    // Initialisation du client PostgreSQL avec les variables d'environnement
    this.client = new Client({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });
    this.client.connect(); // Connexion à la base de données
  }

  @Post('test-google-token')
  async testGoogleToken(@Body() body: { access_token: string }) {
    const accessToken = body.access_token;

    try {
      // Interroger l'API Google pour obtenir les informations de l'utilisateur
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Google authentication failed');
      }

      const userInfo = await response.json();

      // Vérification des informations utilisateur
      if (!userInfo.email) {
        return { message: 'Utilisateur non valide!' };
      }

      // Vérifier si l'utilisateur existe déjà dans la base de données PostgreSQL
      const result = await this.client.query('SELECT * FROM users WHERE email = $1', [userInfo.email]);

      let existingUser = result.rows[0];

      if (!existingUser) {
        // Si l'utilisateur n'existe pas, l'ajouter dans la base de données
        const insertQuery = `
          INSERT INTO users (email, first_name, last_name, google_id)
          VALUES ($1, $2, $3, $4)
          RETURNING *;
        `;
        const insertResult = await this.client.query(insertQuery, [
          userInfo.email,
          userInfo.given_name,
          userInfo.family_name,
          userInfo.sub,
        ]);

        existingUser = insertResult.rows[0]; // Récupère l'utilisateur nouvellement ajouté
      }

      // Retourner les informations utilisateur
      return { user: existingUser };
    } catch (error) {
      if (error instanceof Error) {
        return { message: 'Erreur de traitement du token Google', error: error.message };
      } else {
        return { message: 'Erreur inconnue', error: 'Erreur inconnue' };
      }
    }
  }
}
