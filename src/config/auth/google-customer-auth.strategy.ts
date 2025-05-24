// src/config/auth/google-customer-auth.strategy.ts
import {
    AuthenticationStrategy,
    RequestContext,
    Injector,
    TransactionalConnection,
    User,
    Customer,
    UserInputError,
    InternalServerError,
    Logger,
    RoleService,
    ConfigService,
    CustomerService,
    isGraphQlErrorResult,
} from '@vendure/core';
import { OAuth2Client } from 'google-auth-library';
import gql from 'graphql-tag';
import { Not } from 'typeorm';

const loggerCtx = 'GoogleCustomerAuthStrategy';

export class GoogleCustomerAuthStrategy implements AuthenticationStrategy {
    readonly name = 'googleCustomer';

    private connection: TransactionalConnection;
    private roleService: RoleService;
    private configService: ConfigService;
    private customerService: CustomerService;
    private client: OAuth2Client;

    init(injector: Injector) {
        this.connection = injector.get(TransactionalConnection);
        this.roleService = injector.get(RoleService);
        this.configService = injector.get(ConfigService);
        this.customerService = injector.get(CustomerService);
        this.client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    }

    async authenticate(ctx: RequestContext, data: { token: string }): Promise<User | false> {
        try {
            Logger.info('🔐 Début de l’authentification Google...', loggerCtx);

            const ticket = await this.client.verifyIdToken({
                idToken: data.token,
                audience: process.env.GOOGLE_CLIENT_ID,
            });

            const payload = ticket.getPayload();
            if (!payload || !payload.email_verified) {
                throw new UserInputError('Email non vérifié par Google.');
            }

            const email = payload.email!;
            const externalId = payload.sub!;
            const firstName = payload.given_name || '';
            const lastName = payload.family_name || '';

            Logger.info(`✅ Payload reçu : ${email} (ID: ${externalId})`, loggerCtx);

            const userRepo = this.connection.getRepository(ctx, User);
            const authMethodRepo = this.connection.rawConnection.getRepository('authentication_method');

            // 1. Rechercher authMethod existante
            const existingAuth = await authMethodRepo.findOne({
                where: { strategy: this.name, externalIdentifier: externalId },
                relations: ['user'],
            });

            if (existingAuth?.user) {
                Logger.info('✅ Utilisateur existant trouvé via Google ID.', loggerCtx);
                return existingAuth.user;
            }

            // 2. Rechercher user existant via email
            let user = await userRepo.findOne({
                where: { identifier: email },
                relations: ['authenticationMethods'],
            });

            let customer: Customer | undefined;

            if (!user) {
                // 🔒 Vérification d'un autre compte avec la même adresse email mais une stratégie différente
                const emailAlreadyUsed = await authMethodRepo.find({
                    where: {
                        identifier: email,
                        strategy: Not(this.name),
                    },
                });

                if (emailAlreadyUsed.length > 0) {
                    Logger.warn(`🚫 Adresse email déjà utilisée par une autre stratégie.`, loggerCtx);
                    throw new UserInputError('Un compte avec cette adresse email existe déjà avec une autre méthode de connexion.');
                }

                Logger.info(`➕ Création d’un nouveau customer pour ${email}`, loggerCtx);

                const customerRole = await this.roleService.getCustomerRole(ctx);

                // 3. Création customer via service pour respecter la hiérarchie
                const result = await this.customerService.create(ctx, {
                    emailAddress: email,
                    firstName,
                    lastName,
                    customFields: {
                        externalProvider: 'google',
                        externalId: externalId,
                    },
                });

                if (isGraphQlErrorResult(result)) {
                    throw new InternalServerError(`Erreur création customer : ${result.message}`);
                }

                customer = result;
                user = customer.user!;
                user.roles = [customerRole];
                user.verified = true;
                await userRepo.save(user);

                user = await userRepo.findOneOrFail({
                    where: { identifier: email },
                    relations: ['authenticationMethods'],
                });

                if (!user.id) {
                    throw new InternalServerError('Utilisateur enregistré mais sans ID. Vérifiez le processus de sauvegarde.');
                }

                Logger.info(`✅ Customer créé (ID: ${customer.id})`, loggerCtx);
            } else {
                Logger.info('🔍 Utilisateur trouvé via email. Récupération du customer...', loggerCtx);
                customer = await this.customerService.findOneByUserId(ctx, user.id) ?? undefined;
            }

            // 4. Ajouter méthode d’authentification Google si absente
            const existingMethod = await authMethodRepo.findOne({
                where: { strategy: this.name, externalIdentifier: externalId },
            });

            if (!existingMethod) {
                await authMethodRepo.save({
                    strategy: this.name,
                    type: 'external',
                    externalIdentifier: externalId,
                    identifier: email,
                    user: { id: user.id },
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });

                Logger.info('🔐 Méthode d’authentification Google ajoutée.', loggerCtx);
            }

            // 5. Lier customer au channel par défaut
            if (customer) {
                const linkCheck = await this.connection.rawConnection.query(
                    `SELECT * FROM customer_channels_channel WHERE "customerId" = $1 AND "channelId" = $2`,
                    [customer.id, 1],
                );

                if (linkCheck.length === 0) {
                    await this.connection.rawConnection.query(
                        `INSERT INTO customer_channels_channel("customerId", "channelId") VALUES ($1, $2)`,
                        [customer.id, 1],
                    );
                    Logger.info(`🔗 Customer ${customer.id} lié au channel 1`, loggerCtx);
                } else {
                    Logger.debug(`🔗 Customer ${customer.id} déjà lié au channel 1`, loggerCtx);
                }
            }

            Logger.info(`✅ Authentification Google réussie pour ${email}`, loggerCtx);
            return user;
        } catch (err: any) {
            Logger.error(`❌ Erreur d’authentification Google : ${err.message}`, loggerCtx);
            return false;
        }
    }

    defineInputType() {
        return gql`
            input GoogleCustomerAuthInput {
                token: String!
            }
        `;
    }
}
