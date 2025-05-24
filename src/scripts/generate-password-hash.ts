// src\scripts\generate-password-hash.ts
import * as bcrypt from 'bcrypt';

const password = process.argv[2]; // récupère le mot de passe passé en argument

if (!password) {
  console.error('❌ Veuillez fournir un mot de passe à hasher. Exemple : npm run hash "Lina2025!"');
  process.exit(1);
}

bcrypt.hash(password, 12).then(hash => {
  console.log(`✅ Hash généré pour "${password}":`);
  console.log(hash);
});
