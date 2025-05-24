import { Client } from 'pg';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

const client = new Client({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function migrateAssets() {
  try {
    await client.connect();

    // Récupérer toutes les images de la table asset
    const assets = await client.query('SELECT id, source FROM asset');
    console.log(`📝 Nombre total d'images à migrer : ${assets.rows.length}`);

    for (const asset of assets.rows) {
      const { id, source } = asset;

      console.log(`📤 Traitement de l'image ID ${id}...`);

      try {
        // Uploader l'image sur Cloudinary avec des optimisations
        const uploadResponse = await cloudinary.uploader.upload(source, {
          folder: 'carrefour33_assets', // Organiser les images dans un dossier
          transformation: [
            {
              quality: 'auto', // Optimisation automatique de la qualité
              fetch_format: 'auto', // Conversion automatique au format optimal (WebP si nécessaire)
              crop: 'scale', // Redimensionnement au besoin
              width: 540, // Garder la largeur actuelle ou redimensionner si nécessaire
              height: 540, // Garder la hauteur actuelle
              dpr: 'auto', // Résolution automatique selon le périphérique
            },
          ],
        });

        console.log(`✅ Image ID ${id} uploadée avec succès sur Cloudinary !`);
        console.log(`URL de l'image : ${uploadResponse.secure_url}`);

        // Mettre à jour les colonnes source et preview avec la même URL Cloudinary
        const newUrl = uploadResponse.secure_url;

        await client.query(
          'UPDATE asset SET source = $1, preview = $2 WHERE id = $3',
          [newUrl, newUrl, id]
        );

        console.log(`🔄 URLs de l'image ID ${id} mises à jour dans la base de données.`);

      } catch (uploadError) {
        console.error(`❌ Erreur lors de l'upload de l'image ID ${id}:`, uploadError);
      }
    }

    console.log('🚀 Toutes les images ont été traitées !');
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des images :', error);
  } finally {
    await client.end();
  }
}

// Exécuter le script
migrateAssets();
