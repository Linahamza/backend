//src\config\auth\google-auth.strategy.ts
import {
  AuthenticationStrategy,
  RequestContext,
  UserInputError,
  Injector,
  UserService,
  RoleService,
  AdministratorService,
  TransactionalConnection,
  SessionService,
  Logger,
  User,
} from '@vendure/core';
import { OAuth2Client } from 'google-auth-library';
import gql from 'graphql-tag';
import crypto from 'crypto';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export class GoogleAuthStrategy implements AuthenticationStrategy {
  readonly name = 'google';

  private userService: UserService;
  private roleService: RoleService;
  private administratorService: AdministratorService;
  private connection: TransactionalConnection;
  private sessionService: SessionService;

  init(injector: Injector) {
    this.userService = injector.get(UserService);
    this.roleService = injector.get(RoleService);
    this.administratorService = injector.get(AdministratorService);
    this.connection = injector.get(TransactionalConnection);
    this.sessionService = injector.get(SessionService);
  }

  async authenticate(ctx: RequestContext, data: { token: string }): Promise<User | false> {
    try {
      // 1. Vérification du token Google
      const ticket = await client.verifyIdToken({
        idToken: data.token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email_verified) {
        throw new UserInputError('Email non vérifié ou token invalide');
      }

      const { email, given_name, family_name } = payload;
      const identifier = email!;
      const password = crypto.randomBytes(16).toString('hex'); // Mot de passe aléatoire (non utilisé)

      // 2. Vérification de l'existence de l'utilisateur
      const existingUser = await this.userService.getUserByEmailAddress(ctx, identifier);
      if (existingUser) {
        // Mise à jour du lastLogin
        await this.connection.getRepository(ctx, User).update(
          { id: existingUser.id },
          { lastLogin: new Date() }
        );

        // Création de la session
        await this.sessionService.createNewAuthenticatedSession(
          ctx,
          existingUser,
          this.name
        );

        return existingUser;
      }

      // 3. Récupération du rôle SuperAdmin
      const superAdminRole = await this.roleService.getSuperAdminRole(ctx);

      // 4. Création du nouvel administrateur (utilisateur + admin + auth method gérés en interne)
      await this.administratorService.create(ctx, {
        emailAddress: identifier,
        firstName: given_name || identifier.split('@')[0],
        lastName: family_name || 'User',
        password,
        roleIds: [superAdminRole.id],
      });

      // 5. Récupération de l'utilisateur nouvellement créé
      const createdUser = await this.userService.getUserByEmailAddress(ctx, identifier);
      if (!createdUser) {
        throw new Error('Utilisateur non trouvé après création');
      }

      // 6. Création de la session
      await this.sessionService.createNewAuthenticatedSession(
        ctx,
        createdUser,
        this.name
      );

      Logger.info(`Nouvel administrateur créé via Google Auth: ${identifier}`);
      return createdUser;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      Logger.error(`Échec de l'authentification Google: ${message}`);
      throw new UserInputError('Échec de l\'authentification: ' + message);
    }
  }

  defineInputType() {
    return gql`
      input GoogleAuthInput {
        token: String!
      }
    `;
  }
}
