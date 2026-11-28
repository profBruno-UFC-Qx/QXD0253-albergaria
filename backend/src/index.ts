import type { Core } from '@strapi/strapi';

const AUTHENTICATED_ACTIONS = [
  // Favoritos
  'api::favorito.favorito.find',
  'api::favorito.favorito.findOne',
  'api::favorito.favorito.create',
  'api::favorito.favorito.delete',
  // Contatos / Mensagens
  'api::contato.contato.find',
  'api::contato.contato.findOne',
  'api::contato.contato.create',
  'api::contato.contato.update',
  'api::contato.contato.delete',
  // Solicitações de Visita
  'api::visita.visita.find',
  'api::visita.visita.findOne',
  'api::visita.visita.create',
  'api::visita.visita.update',
  'api::visita.visita.delete',
];

export default {
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    strapi.db.lifecycles.subscribe({
      models: ['plugin::users-permissions.user'],

      async afterCreate(event: any) {
        const { result } = event;
        strapi.log.info(`[afterCreate user] tipo_perfil: ${result?.tipo_perfil}`);
        if (result?.tipo_perfil !== 'ANUNCIANTE') return;

        try {
          const role = await strapi.db
            .query('plugin::users-permissions.role')
            .findOne({ where: { type: 'anunciante' } });
          strapi.log.info(`[afterCreate user] role encontrado: ${role?.id}`);
          if (!role) return;

          const anunciante = await strapi
            .documents('api::anunciante.anunciante')
            .create({
              data: { nome: result.nome, telefone: result.telefone },
            });

          await strapi.db.query('plugin::users-permissions.user').update({
            where: { id: result.id },
            data: { role: role.id, anunciante: anunciante.id },
          });
        } catch (error) {
          strapi.log.error('Erro ao configurar usuário anunciante:', error);
        }
      },
    });
    
    try {
      const authenticatedRole = await strapi.db
        .query('plugin::users-permissions.role')
        .findOne({
          where: { type: 'authenticated' },
          populate: ['permissions'],
        });

      if (!authenticatedRole) {
        return;
      }

      const existingPermissions: Array<{ action?: string }> =
        authenticatedRole.permissions ?? [];
      const existingActions = new Set(
        existingPermissions
          .map((permission) => permission.action)
          .filter((action): action is string => Boolean(action))
      );

      for (const action of AUTHENTICATED_ACTIONS) {
        if (!existingActions.has(action)) {
          await strapi.db
            .query('plugin::users-permissions.permission')
            .create({
              data: {
                action,
                role: authenticatedRole.id,
              },
            });
        }
      }
    } catch (error) {
      strapi.log.error(
        'Erro ao configurar permissões automáticas no bootstrap:',
        error
      );
    }
  },
};