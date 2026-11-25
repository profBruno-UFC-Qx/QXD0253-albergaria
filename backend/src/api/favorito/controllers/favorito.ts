/**
 * favorito controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::favorito.favorito', ({ strapi }) => ({
    // Lista apenas os favoritos do usuário autenticado
    async find(ctx) {
        const user = ctx.state.user;
        if (!user) {
            return ctx.unauthorized('Você precisa estar autenticado para ver seus favoritos.');
        }

        await this?.validateQuery?.(ctx);
        const sanitizedQuery: any = (await this?.sanitizeQuery?.(ctx)) ?? {};

        const hasExistingFilters =
            sanitizedQuery.filters &&
            typeof sanitizedQuery.filters === 'object' &&
            Object.keys(sanitizedQuery.filters).length > 0;

        const filters = hasExistingFilters
            ? {
                $and: [
                    sanitizedQuery.filters,
                    { usuario: { id: { $eq: user.id } } },
                ],
            }
            : { usuario: { id: { $eq: user.id } } };

        const { results, pagination } = await (
            strapi.service('api::favorito.favorito') as any
        ).find({
            ...sanitizedQuery,
            filters,
        });

        const sanitizedResults = (await this?.sanitizeOutput?.(results, ctx)) ?? results;
        return (
            this?.transformResponse?.(sanitizedResults, { pagination }) ?? {
                data: sanitizedResults,
                meta: { pagination },
            }
        );
    },

    // Permite ver um favorito específico apenas se for do próprio usuário
    async findOne(ctx) {
        const user = ctx.state.user;
        if (!user) {
            return ctx.unauthorized('Você precisa estar autenticado.');
        }

        const { id } = ctx.params;
        const favorito: any = await strapi.documents('api::favorito.favorito').findOne({
            documentId: id,
            populate: ['usuario'],
        });

        if (!favorito) {
            return ctx.notFound('Favorito não encontrado.');
        }

        if (favorito.usuario?.id !== user.id) {
            return ctx.forbidden('Você não tem permissão para acessar este favorito.');
        }

        return await super.findOne(ctx);
    },

    // Cria favorito para o usuário logado e impede duplicação
    async create(ctx) {
        const user = ctx.state.user;
        if (!user) {
            return ctx.unauthorized('Você precisa estar autenticado para favoritar um imóvel.');
        }

        const body = (ctx.request.body ?? {}) as { data?: { imovel?: string | number } };
        const rawImovel = body.data?.imovel;

        if (!rawImovel) {
            return ctx.badRequest('O campo "imovel" é obrigatório.');
        }

        const isNumericId =
            typeof rawImovel === 'number' ||
            (typeof rawImovel === 'string' && /^\d+$/.test(rawImovel));

        const imovelFilter = isNumericId
            ? { id: { $eq: Number(rawImovel) } }
            : { documentId: { $eq: String(rawImovel) } };

        // Busca o imóvel aceitando tanto documentId quanto id numérico
        let imovel: any = await strapi.documents('api::imovel.imovel').findFirst({
            filters: imovelFilter as any,
            status: 'published',
        });

        if (!imovel) {
            imovel = await strapi.documents('api::imovel.imovel').findFirst({
                filters: imovelFilter as any,
            });
        }

        if (!imovel) {
            return ctx.notFound('Imóvel não encontrado.');
        }

        // Regra de unicidade: impede favoritar o mesmo imóvel duas vezes
        const existente = await strapi.documents('api::favorito.favorito').findFirst({
            filters: {
                usuario: { id: { $eq: user.id } },
                imovel: { documentId: { $eq: imovel.documentId } },
            } as any,
        });

        if (existente) {
            return ctx.conflict('Este imóvel já está nos seus favoritos.');
        }

        const novoFavorito = await strapi.documents('api::favorito.favorito').create({
            data: {
                usuario: user.documentId ?? user.id,
                imovel: imovel.documentId,
            } as any,
            populate: ['imovel'],
        });

        const sanitized = (await this?.sanitizeOutput?.(novoFavorito, ctx)) ?? novoFavorito;
        return this?.transformResponse?.(sanitized) ?? { data: sanitized };
    },

    // Bloqueia edição direta (favorito deve ser criado ou removido)
    async update(ctx) {
        return ctx.forbidden('Não é permitido editar um favorito. Remova e adicione novamente.');
    },

    // Permite remover apenas se o favorito pertencer ao usuário logado
    async delete(ctx) {
        const user = ctx.state.user;
        if (!user) {
            return ctx.unauthorized('Você precisa estar autenticado.');
        }

        const { id } = ctx.params;
        const favorito: any = await strapi.documents('api::favorito.favorito').findOne({
            documentId: id,
            populate: ['usuario'],
        });

        if (!favorito) {
            return ctx.notFound('Favorito não encontrado.');
        }

        if (favorito.usuario?.id !== user.id) {
            return ctx.forbidden('Você não tem permissão para remover este favorito.');
        }

        return await super.delete(ctx);
    },
}));