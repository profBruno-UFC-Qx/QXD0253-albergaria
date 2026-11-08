import type { Schema, Struct } from '@strapi/strapi';

export interface LocalizacaoEndereco extends Struct.ComponentSchema {
  collectionName: 'components_localizacao_enderecos';
  info: {
    displayName: 'endereco';
    icon: 'pinMap';
  };
  attributes: {
    bairro: Schema.Attribute.String & Schema.Attribute.Required;
    cidade: Schema.Attribute.String & Schema.Attribute.Required;
    exibir_localizacao_exata: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    latitude: Schema.Attribute.Decimal & Schema.Attribute.Required;
    logradouro: Schema.Attribute.String;
    longitude: Schema.Attribute.Decimal & Schema.Attribute.Required;
  };
}

declare module '@strapi/strapi' {
  export namespace Public {
    export interface ComponentSchemas {
      'localizacao.endereco': LocalizacaoEndereco;
    }
  }
}
