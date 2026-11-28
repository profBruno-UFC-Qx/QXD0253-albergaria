export default async (policyContext: any, _config: any, { strapi }: any) => {
  const user = policyContext.state.user;
  if (!user) return false;

  const imovel = await strapi.documents('api::imovel.imovel').findOne({
    documentId: policyContext.params.id,
    populate: { anunciante: { populate: { user: true } } },
  });

  return imovel?.anunciante?.user?.id === user.id;
};