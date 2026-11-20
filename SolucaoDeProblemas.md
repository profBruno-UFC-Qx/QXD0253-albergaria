# Solucao de problemas

## Erro ao construir o painel administrativo

Se o comando `npm run build` falhar no diretório `backend` com um erro semelhante a:

```text
Rollup failed to resolve import "@ai-sdk/provider-utils"
```

reinstale as dependências do projeto a partir do lockfile:

```bash
cd backend
npm ci
npm run build
```

`npm ci` remove a pasta local `node_modules` e instala exatamente as versões registradas em `package-lock.json`. Não é necessário adicionar `@ai-sdk/provider-utils` manualmente ao `package.json`; ele é uma dependência transitiva usada pelo Strapi.

Use Node.js 22, conforme a configuração de engines do projeto.

Após o build, a saída deve terminar com:

```text
✔ Building admin panel
```
