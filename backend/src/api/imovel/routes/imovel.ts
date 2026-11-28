/**
 * imovel router
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::imovel.imovel', {
  config: {
    update: { policies: ['api::imovel.is-owner'] },
    delete: { policies: ['api::imovel.is-owner'] },
  },
});