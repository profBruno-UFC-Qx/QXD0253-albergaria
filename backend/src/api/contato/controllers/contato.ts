/**
 * contato controller
 */

import { factories } from '@strapi/strapi';

const CANAIS_VALIDOS = ['MENSAGEM', 'WHATSAPP', 'TELEFONE'] as const;
const STATUS_VALIDOS = ['NOVO', 'LIDO', 'RESPONDIDO'] as const;

function isAnuncianteOwner(record: any, userId: number): boolean {
    return (
        record?.anunciante?.user?.id === userId ||
        record?.anunciante?.usuario?.id === userId
    );
}

export default factories.createCoreController('api::contato.contato', ({ strapi }) => ({
    // Lista contatos enviados pelo usuário logado ou recebidos como anunciante
    async find(ctx) {
        const user = ctx.state.user;
        if (!user) {
            return ctx.unauthorized('Você precisa estar autenticado para ver seus contatos.');
        }

        const ownershipFilter = {
            $or: [
                { usuario: { id: { $eq: user.id } } },
                { anunciante: { user: { id: { $eq: user.id } } } },
                { anunciante: { usuario: { id: { $eq: user.id } } } },
            ],
        };

        const hasExistingFilters =
            ctx.query.filters &&
            typeof ctx.query.filters === 'object' &&
            Object.keys(ctx.query.filters).length > 0;

        ctx.query = {
            ...ctx.query,
            filters: hasExistingFilters
                ? { $and: [ctx.query.filters, ownershipFilter] }
                : ownershipFilter,
        };

        return await super.find(ctx);
    },

    // Permite ver um contato específico se for o remetente ou o anunciante do imóvel
    async findOne(ctx) {
        const user = ctx.state.user;
        if (!user) {
            return ctx.unauthorized('Você precisa estar autenticado.');
        }

        const { id } = ctx.params;
        const contato: any = await strapi.documents('api::contato.contato').findOne({
            documentId: id,
            populate: {
                usuario: true,
                anunciante: { populate: ['user', 'usuario'] },
            } as any,
        });

        if (!contato) {
            return ctx.notFound('Contato não encontrado.');
        }

        const isSender = contato.usuario?.id === user.id;
        if (!isSender && !isAnuncianteOwner(contato, user.id)) {
            return ctx.forbidden('Você não tem permissão para acessar este contato.');
        }

        return await super.findOne(ctx);
    },

    // Cria uma nova mensagem/registro de contato vinculando usuário, imóvel e anunciante
    async create(ctx) {
        const user = ctx.state.user;
        if (!user) {
            return ctx.unauthorized('Você precisa estar autenticado para enviar um contato.');
        }

        const body = (ctx.request.body ?? {}) as {
            data?: {
                imovel?: string | number;
                mensagem?: string;
                canal?: string;
                telefone_contato?: string;
            };
        };

        const rawImovel = body.data?.imovel;
        const mensagem = body.data?.mensagem?.trim();
        const canalInformado = body.data?.canal?.toUpperCase() ?? 'MENSAGEM';
        const telefoneContato = body.data?.telefone_contato?.trim() || user.telefone || '';

        if (!rawImovel) {
            return ctx.badRequest('O campo "imovel" é obrigatório.');
        }

        if (!mensagem) {
            return ctx.badRequest('O campo "mensagem" é obrigatório.');
        }

        if (!CANAIS_VALIDOS.includes(canalInformado as any)) {
            return ctx.badRequest('Canal inválido. Use MENSAGEM, WHATSAPP ou TELEFONE.');
        }

        const isNumericId =
            typeof rawImovel === 'number' ||
            (typeof rawImovel === 'string' && /^\d+$/.test(rawImovel));

        const imovelFilter = isNumericId
            ? { id: { $eq: Number(rawImovel) } }
            : { documentId: { $eq: String(rawImovel) } };

        let imovel: any = await strapi.documents('api::imovel.imovel').findFirst({
            filters: imovelFilter as any,
            status: 'published',
            populate: ['anunciante'],
        });

        if (!imovel) {
            imovel = await strapi.documents('api::imovel.imovel').findFirst({
                filters: imovelFilter as any,
                populate: ['anunciante'],
            });
        }

        if (!imovel) {
            return ctx.notFound('Imóvel não encontrado.');
        }

        const dataToCreate: Record<string, any> = {
            mensagem,
            canal: canalInformado,
            telefone_contato: telefoneContato,
            status_contato: 'NOVO',
            usuario: user.documentId ?? user.id,
            imovel: imovel.documentId,
        };

        if (imovel.anunciante) {
            dataToCreate.anunciante = imovel.anunciante.documentId ?? imovel.anunciante.id;
        }

        const novoContato = await strapi.documents('api::contato.contato').create({
            data: dataToCreate as any,
            populate: ['imovel', 'anunciante'],
        });

        const sanitized = (await this?.sanitizeOutput?.(novoContato, ctx)) ?? novoContato;
        return this?.transformResponse?.(sanitized) ?? { data: sanitized };
    },

    // Permite apenas ao anunciante atualizar o status do contato (LIDO / RESPONDIDO)
    async update(ctx) {
        const user = ctx.state.user;
        if (!user) {
            return ctx.unauthorized('Você precisa estar autenticado.');
        }

        const { id } = ctx.params;
        const contato: any = await strapi.documents('api::contato.contato').findOne({
            documentId: id,
            populate: {
                usuario: true,
                anunciante: { populate: ['user', 'usuario'] },
            } as any,
        });

        if (!contato) {
            return ctx.notFound('Contato não encontrado.');
        }

        if (!isAnuncianteOwner(contato, user.id)) {
            return ctx.forbidden('Apenas o anunciante do imóvel pode atualizar o status do contato.');
        }

        const body = (ctx.request.body ?? {}) as { data?: { status_contato?: string } };
        const novoStatus = body.data?.status_contato?.toUpperCase();

        if (!novoStatus || !STATUS_VALIDOS.includes(novoStatus as any)) {
            return ctx.badRequest('Status inválido. Use NOVO, LIDO ou RESPONDIDO.');
        }

        const atualizado = await strapi.documents('api::contato.contato').update({
            documentId: id,
            data: { status_contato: novoStatus } as any,
            populate: ['imovel', 'anunciante'],
        });

        const sanitized = (await this?.sanitizeOutput?.(atualizado, ctx)) ?? atualizado;
        return this?.transformResponse?.(sanitized) ?? { data: sanitized };
    },

    // Permite remover o contato se for o remetente ou o anunciante
    async delete(ctx) {
        const user = ctx.state.user;
        if (!user) {
            return ctx.unauthorized('Você precisa estar autenticado.');
        }

        const { id } = ctx.params;
        const contato: any = await strapi.documents('api::contato.contato').findOne({
            documentId: id,
            populate: {
                usuario: true,
                anunciante: { populate: ['user', 'usuario'] },
            } as any,
        });

        if (!contato) {
            return ctx.notFound('Contato não encontrado.');
        }

        const isSender = contato.usuario?.id === user.id;
        if (!isSender && !isAnuncianteOwner(contato, user.id)) {
            return ctx.forbidden('Você não tem permissão para remover este contato.');
        }

        return await super.delete(ctx);
    },
}));