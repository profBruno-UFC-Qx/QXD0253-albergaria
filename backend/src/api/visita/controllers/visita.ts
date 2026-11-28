/**
 * visita controller
 */

import { factories } from '@strapi/strapi';

const STATUS_VALIDOS = ['PENDENTE', 'CONFIRMADA', 'RECUSADA', 'CANCELADA'] as const;

function isAnuncianteOwner(record: any, userId: number): boolean {
    return (
        record?.anunciante?.user?.id === userId ||
        record?.anunciante?.usuario?.id === userId
    );
}

export default factories.createCoreController('api::visita.visita', ({ strapi }) => ({
    // Lista visitas solicitadas pelo usuário logado ou recebidas como anunciante
    async find(ctx) {
        const user = ctx.state.user;
        if (!user) {
            return ctx.unauthorized('Você precisa estar autenticado para ver suas visitas.');
        }

        const registros: any[] = await strapi.documents('api::visita.visita').findMany({
            filters: {
                $or: [
                    { usuario: { id: { $eq: user.id } } },
                    { anunciante: { user: { id: { $eq: user.id } } } },
                    { anunciante: { usuario: { id: { $eq: user.id } } } },
                ],
            } as any,
            populate: {
                imovel: {
                    populate: ['anuncios', 'endereco'],
                },
                anunciante: {
                    populate: ['user', 'usuario'],
                },
                usuario: true,
            } as any,
            sort: { createdAt: 'desc' } as any,
        });

        const data = registros.map((item) => ({
            id: item.id,
            documentId: item.documentId,
            data_visita: item.data_visita,
            horario: item.horario,
            observacoes: item.observacoes,
            telefone_contato: item.telefone_contato,
            status_visita: item.status_visita,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
            eh_remetente: item.usuario?.id === user.id,
            eh_anunciante: isAnuncianteOwner(item, user.id),
            usuario: item.usuario
                ? {
                    id: item.usuario.id,
                    username: item.usuario.username,
                    nome: item.usuario.nome,
                    sobrenome: item.usuario.sobrenome,
                    email: item.usuario.email,
                    telefone: item.usuario.telefone,
                }
                : null,
            anunciante: item.anunciante
                ? {
                    id: item.anunciante.id,
                    documentId: item.anunciante.documentId,
                    nome: item.anunciante.nome,
                    telefone: item.anunciante.telefone,
                }
                : null,
            imovel: item.imovel
                ? {
                    id: item.imovel.id,
                    documentId: item.imovel.documentId,
                    quartos: item.imovel.quartos,
                    banheiros: item.imovel.banheiros,
                    metragem: item.imovel.metragem,
                    endereco: item.imovel.endereco ?? null,
                    anuncios: Array.isArray(item.imovel.anuncios)
                        ? item.imovel.anuncios.map((a: any) => ({
                            id: a.id,
                            documentId: a.documentId,
                            titulo: a.titulo,
                            preco: a.preco,
                        }))
                        : [],
                }
                : null,
        }));

        return { data, meta: { pagination: { total: data.length } } };
    },

    // Permite ver uma visita específica se for o solicitante ou o anunciante do imóvel
    async findOne(ctx) {
        const user = ctx.state.user;
        if (!user) {
            return ctx.unauthorized('Você precisa estar autenticado.');
        }

        const { id } = ctx.params;
        const visita: any = await strapi.documents('api::visita.visita').findOne({
            documentId: id,
            populate: {
                usuario: true,
                anunciante: { populate: ['user', 'usuario'] },
            } as any,
        });

        if (!visita) {
            return ctx.notFound('Solicitação de visita não encontrada.');
        }

        const isSender = visita.usuario?.id === user.id;
        if (!isSender && !isAnuncianteOwner(visita, user.id)) {
            return ctx.forbidden('Você não tem permissão para acessar esta solicitação.');
        }

        return await super.findOne(ctx);
    },

    // Cria uma nova solicitação de visita vinculando usuário, imóvel e anunciante
    async create(ctx) {
        const user = ctx.state.user;
        if (!user) {
            return ctx.unauthorized('Você precisa estar autenticado para solicitar uma visita.');
        }

        const body = (ctx.request.body ?? {}) as {
            data?: {
                imovel?: string | number;
                data_visita?: string;
                horario?: string;
                observacoes?: string;
                telefone_contato?: string;
            };
        };

        const rawImovel = body.data?.imovel;
        const dataVisita = body.data?.data_visita?.trim();
        const horario = body.data?.horario?.trim();
        const observacoes = body.data?.observacoes?.trim() ?? '';
        const telefoneContato = body.data?.telefone_contato?.trim() || user.telefone || '';

        if (!rawImovel) {
            return ctx.badRequest('O campo "imovel" é obrigatório.');
        }

        if (!dataVisita) {
            return ctx.badRequest('O campo "data_visita" é obrigatório.');
        }

        if (!horario) {
            return ctx.badRequest('O campo "horario" é obrigatório.');
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
            data_visita: dataVisita,
            horario,
            observacoes,
            telefone_contato: telefoneContato,
            status_visita: 'PENDENTE',
            usuario: user.documentId ?? user.id,
            imovel: imovel.documentId,
        };

        if (imovel.anunciante) {
            dataToCreate.anunciante = imovel.anunciante.documentId ?? imovel.anunciante.id;
        }

        const novaVisita = await strapi.documents('api::visita.visita').create({
            data: dataToCreate as any,
            populate: ['imovel', 'anunciante'],
        });

        const sanitized = (await this?.sanitizeOutput?.(novaVisita, ctx)) ?? novaVisita;
        return this?.transformResponse?.(sanitized) ?? { data: sanitized };
    },

    // Anunciante pode confirmar/recusar/cancelar; solicitante pode apenas cancelar
    async update(ctx) {
        const user = ctx.state.user;
        if (!user) {
            return ctx.unauthorized('Você precisa estar autenticado.');
        }

        const { id } = ctx.params;
        const visita: any = await strapi.documents('api::visita.visita').findOne({
            documentId: id,
            populate: {
                usuario: true,
                anunciante: { populate: ['user', 'usuario'] },
            } as any,
        });

        if (!visita) {
            return ctx.notFound('Solicitação de visita não encontrada.');
        }

        const isSender = visita.usuario?.id === user.id;
        const isOwner = isAnuncianteOwner(visita, user.id);

        if (!isSender && !isOwner) {
            return ctx.forbidden('Você não tem permissão para alterar esta solicitação.');
        }

        const body = (ctx.request.body ?? {}) as { data?: { status_visita?: string } };
        const novoStatus = body.data?.status_visita?.toUpperCase();

        if (!novoStatus || !STATUS_VALIDOS.includes(novoStatus as any)) {
            return ctx.badRequest('Status inválido. Use PENDENTE, CONFIRMADA, RECUSADA ou CANCELADA.');
        }

        if (!isOwner && novoStatus !== 'CANCELADA') {
            return ctx.forbidden('O solicitante pode apenas cancelar a própria visita.');
        }

        const atualizada = await strapi.documents('api::visita.visita').update({
            documentId: id,
            data: { status_visita: novoStatus } as any,
            populate: ['imovel', 'anunciante'],
        });

        const sanitized = (await this?.sanitizeOutput?.(atualizada, ctx)) ?? atualizada;
        return this?.transformResponse?.(sanitized) ?? { data: sanitized };
    },

    // Permite remover a visita se for o solicitante ou o anunciante
    async delete(ctx) {
        const user = ctx.state.user;
        if (!user) {
            return ctx.unauthorized('Você precisa estar autenticado.');
        }

        const { id } = ctx.params;
        const visita: any = await strapi.documents('api::visita.visita').findOne({
            documentId: id,
            populate: {
                usuario: true,
                anunciante: { populate: ['user', 'usuario'] },
            } as any,
        });

        if (!visita) {
            return ctx.notFound('Solicitação de visita não encontrada.');
        }

        const isSender = visita.usuario?.id === user.id;
        if (!isSender && !isAnuncianteOwner(visita, user.id)) {
            return ctx.forbidden('Você não tem permissão para remover esta visita.');
        }

        return await super.delete(ctx);
    },
}));