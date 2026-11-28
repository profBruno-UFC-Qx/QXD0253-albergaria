/**
 * imovel controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::imovel.imovel', ({ strapi }) => ({
  async create(ctx) {
    const anunciante = await strapi.db
      .query('api::anunciante.anunciante')
      .findOne({ where: { user: { id: ctx.state.user.id } } });

    if (!anunciante) return ctx.forbidden('Usuário não é anunciante.');

    const body = ctx.request.body as any;
    body.data = {
      ...body.data,
      anunciante: anunciante.documentId,
    };

    return super.create(ctx);
  },
}));