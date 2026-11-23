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