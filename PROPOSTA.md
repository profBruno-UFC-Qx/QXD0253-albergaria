🏁 NOME DO PROJETO

# Albergaria

**Descrição breve:** O Albergaria é um site web que permite aos usuários buscar imóveis disponíveis para aluguel por meio de um **mapa interativo com pins**, visualizando a localização exata de cada anúncio, filtrando por preço, tipo de imóvel e outras características, e entrando em contato diretamente com o anunciante.

#Moradia #Aluguel #Tecnologia #Mapas #InclusãoSocial

## 🧑‍💻 Membros da equipe

| Matrícula | Nome |
|---|---|
| 5709705 | Cesário Porto Magalhães Filho |
| *(preencher)* | *(preencher)* |
| *(preencher)* | *(preencher)* |

## 💡 Objetivo Geral

Desenvolver um site web que facilite a busca e a localização de imóveis disponíveis para aluguel, permitindo que os usuários visualizem, em um **mapa interativo com pins**, os locais anunciados de acordo com sua localização, preço e características desejadas.

O projeto terá inicialmente como foco a **locação de imóveis** (casas, apartamentos, quartos, kitnets, entre outros), permitindo que os usuários encontrem opções disponíveis, consultem informações sobre cada anúncio, visualizem sua localização exata no mapa e entrem em contato com o anunciante.

A plataforma também possibilitará que os anunciantes cadastrem seus imóveis, informem valores, condições de locação e disponibilidade, além de destacar imóveis com condições especiais, como valores populares ou facilidades de negociação.

Embora a primeira versão seja direcionada à **locação**, a plataforma será desenvolvida de forma **modular e escalável**, possibilitando sua expansão futura para outras modalidades, como venda de imóveis, temporada, imóveis comerciais, terrenos e outras categorias do mercado imobiliário.

## 👀 Público-Alvo

### Usuários (buscadores de imóveis)

Pessoas que procuram um imóvel para alugar e possuem dificuldade para encontrar opções compatíveis com sua localização, faixa de preço ou tipo de imóvel desejado.

Inicialmente, o sistema será direcionado principalmente a pessoas que buscam **imóveis para locação**, podendo posteriormente atender usuários interessados em outras modalidades, como compra ou temporada.

### Anunciantes

Inicialmente, proprietários, imobiliárias ou corretores que desejam divulgar seus imóveis disponíveis para aluguel, gerenciar suas informações e alcançar mais pessoas interessadas.

Com a expansão da plataforma, outros tipos de anunciantes (venda, temporada, imóveis comerciais) poderão utilizar o sistema para divulgação e gerenciamento de seus anúncios.

## 🤝 Papéis ou tipos de usuário da aplicação

A aplicação contará com diferentes tipos de usuário, cada um com um nível de acesso distinto. Algumas funcionalidades serão acessíveis a qualquer pessoa (mesmo sem login), enquanto outras serão restritas a usuários cadastrados e autenticados.

* **Usuário não logado (visitante):**
  * Visualiza o mapa e os pins dos imóveis disponíveis.
  * Realiza buscas e aplica filtros.
  * Visualiza informações públicas dos anúncios (fotos, preço, localização aproximada, descrição).
  * Não consegue favoritar imóveis, contatar anunciantes ou cadastrar anúncios.

* **Usuário (locatário/buscador):**
  * Possui cadastro e login na plataforma.
  * Favorita imóveis de interesse.
  * Entra em contato com anunciantes.
  * Solicita visitas aos imóveis.
  * Acompanha histórico de imóveis visualizados/contatados.
  * Gerencia seu próprio perfil.

* **Anunciante (locador/imobiliária):**
  * Possui cadastro e login na plataforma.
  * Cadastra, edita, pausa e remove seus imóveis.
  * Define valores, condições e disponibilidade dos anúncios.
  * Visualiza os interessados e mensagens recebidas.
  * Gerencia seu próprio perfil e seus anúncios.

* **Administrador:**
  * Possui acesso privilegiado ao sistema.
  * Modera anúncios cadastrados (aprovação, denúncia, remoção).
  * Gerencia usuários e anunciantes (bloqueio, verificação de conta).
  * Gerencia categorias e tipos de imóveis disponíveis na plataforma.
  * Acompanha estatísticas gerais de uso da plataforma.

## 🚩 Principais funcionalidades da aplicação

> As funcionalidades abaixo indicam, entre parênteses, quais são **acessíveis a todos** (incluindo visitantes não logados) e quais são **restritas a usuários logados** (usuário ou anunciante).

### Mapa interativo *(acessível a todos)*

* Visualização dos imóveis disponíveis por meio de **pins no mapa**.
* Ao clicar no pin, exibição de informações resumidas do imóvel (foto, preço, tipo, distância).
* Agrupamento de pins (clusters) em regiões com muitos imóveis próximos.
* Centralização do mapa a partir da localização do usuário ou de um endereço/bairro pesquisado.

### Busca por imóveis *(acessível a todos)*

* Pesquisa de imóveis cadastrados na plataforma.
* Filtros por:

  * localização (cidade, bairro, raio de distância);
  * faixa de preço;
  * tipo de imóvel (casa, apartamento, quarto, kitnet, etc.);
  * número de quartos/vagas;
  * modalidade (aluguel residencial, comercial);
  * imóveis com condições especiais ou valores populares.
* Visualização das informações do imóvel e dos anúncios relacionados.

### Cadastro e visualização de anúncios *(visualização acessível a todos; cadastro restrito a anunciantes logados)*

* Cadastro do imóvel com fotos, descrição, valor e localização.
* Definição de características do imóvel (metragem, cômodos, mobília, etc.).
* Confirmação e publicação do anúncio.
* Edição, pausa ou remoção do anúncio.
* Marcação de imóvel como indisponível/alugado.

### Contato e interesse no imóvel *(restrito a usuários logados)*

* Contato direto com o anunciante (mensagem, telefone ou WhatsApp).
* Possibilidade de o usuário favoritar imóveis de interesse.
* Solicitação de visita ao imóvel.
* A plataforma não precisa expor publicamente informações financeiras ou dados pessoais sensíveis do usuário.

### Gerenciamento de anúncios (anunciante) *(restrito a anunciantes logados)*

* Cadastro e gerenciamento dos imóveis anunciados.
* Atualização de disponibilidade e valores.
* Visualização de interessados e contatos recebidos.
* Controle de anúncios ativos, pausados e encerrados.

### Área do usuário *(restrito a usuários logados)*

* Cadastro e gerenciamento do perfil.
* Busca de imóveis pelo mapa ou por filtros.
* Lista de imóveis favoritados.
* Histórico de imóveis visualizados/contatados.

### Área do anunciante *(restrito a anunciantes logados)*

* Cadastro das informações do anunciante (pessoa física, proprietário ou imobiliária).
* Cadastro e gerenciamento dos imóveis.
* Gerenciamento dos anúncios e da disponibilidade.
* Configuração dos valores e condições de locação.

### Expansão para outras modalidades

A arquitetura da plataforma será planejada para que o sistema não fique limitado à locação residencial.

Inicialmente, serão implementadas as funcionalidades necessárias para o aluguel de imóveis. Posteriormente, poderão ser adicionadas novas modalidades e categorias de anúncios, permitindo que a mesma infraestrutura seja utilizada para diferentes finalidades do mercado imobiliário.

Entre as possíveis áreas de expansão estão:

* Locação residencial;
* Venda de imóveis;
* Temporada;
* Imóveis comerciais;
* Terrenos e lotes;
* Coworking e salas comerciais;
* Repúblicas e quartos compartilhados;
* Outras categorias do mercado imobiliário.

Essa expansão poderá ocorrer por meio do cadastro de novas categorias de imóveis, tipos de anúncio e características específicas de cada modalidade, mantendo o sistema centralizado em uma única plataforma.

## Etapas de Desenvolvimento

1. **Levantamento de Requisitos**

   * Entrevistas com potenciais usuários e anunciantes.
   * Identificação das principais necessidades de busca e localização.
   * Definição dos requisitos do sistema.
   * Identificação das funcionalidades necessárias para futuras modalidades.

2. **Design e Modelagem**

   * Criação das interfaces para usuários e anunciantes.
   * Definição do fluxo de busca no mapa e visualização de anúncios.
   * Modelagem do banco de dados (imóveis, localização, anunciantes).
   * Estruturação do sistema para permitir o cadastro de diferentes categorias de imóveis.

3. **Desenvolvimento do MVP**

   * Cadastro de usuários.
   * Cadastro de anunciantes e imóveis.
   * Integração do mapa interativo com pins.
   * Busca e filtros.
   * Gerenciamento de anúncios.
   * Contato entre usuário e anunciante.

4. **Testes e Validação**

   * Testes com usuários buscando imóveis.
   * Testes com anunciantes cadastrando imóveis.
   * Avaliação da experiência de utilização do mapa e dos filtros.
   * Correção de problemas e ajustes nas funcionalidades.

5. **Expansão**

   * Avaliação dos resultados obtidos com o MVP.
   * Inclusão de novas modalidades (venda, temporada, comercial).
   * Adaptação das funcionalidades para diferentes tipos de anúncio.
   * Expansão gradual da plataforma para outras regiões e categorias.

## 🌟 Impacto Esperado

* **Social:** Facilitar o acesso da população a imóveis disponíveis para locação, especialmente em regiões onde a busca costuma ser difícil ou pouco centralizada.

* **Acessibilidade:** Aumentar a visibilidade de imóveis com condições populares ou facilidades de negociação, e tornar a busca mais intuitiva por meio do mapa.

* **Para anunciantes:** Fornecer uma ferramenta simples para divulgação de imóveis e gerenciamento de anúncios.

* **Tecnológico:** Centralizar a busca por imóveis, sua localização geográfica e o contato com anunciantes em uma única plataforma.

* **Escalabilidade:** Criar uma plataforma inicialmente voltada para locação, mas estruturada para incorporar progressivamente outras modalidades do mercado imobiliário.

* **Impacto futuro:** Transformar a plataforma em um ambiente abrangente para localização e gerenciamento de imóveis de diferentes finalidades, mantendo como um dos seus principais objetivos facilitar o acesso à moradia por meio de uma busca visual, rápida e centralizada.

## 📆 Entidades ou tabelas do sistema

* **Usuário** — dados de cadastro, credenciais de acesso, tipo de perfil (usuário, anunciante, administrador).
* **Anunciante** — dados complementares de quem publica imóveis (pessoa física ou imobiliária), verificação de conta.
* **Imóvel** — título, descrição, valor, metragem, número de quartos, mobília, condições especiais/valor popular.
* **Endereço/Localização** — endereço, bairro, cidade, coordenadas geográficas (latitude/longitude) usadas para os pins no mapa.
* **Categoria/Tipo de Imóvel** — casa, apartamento, quarto, kitnet, comercial, etc. (estrutura pensada para futura expansão a venda, temporada, terrenos).
* **Anúncio** — vínculo entre imóvel e anunciante, status (ativo, pausado, alugado/encerrado), data de publicação.
* **Foto do Imóvel** — imagens associadas a cada anúncio.
* **Favorito** — relação entre usuário e imóveis marcados como favoritos.
* **Contato/Mensagem** — histórico de mensagens trocadas entre usuário e anunciante sobre um imóvel.
* **Solicitação de Visita** — pedidos de visita feitos pelo usuário, com status (pendente, aceita, recusada, realizada).
* **Denúncia/Moderação** — registros de denúncias de anúncios, usadas pelo administrador na moderação de conteúdo.