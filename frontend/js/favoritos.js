import { obterToken, obterPaginaAtual } from './auth.js';

const API = 'http://localhost:1337/api';
const STRAPI_ORIGIN = 'http://localhost:1337';

// Mapa em memória: chave = documentId (ou id) do imóvel -> valor = objeto do favorito
const mapaFavoritos = new Map();
let delegacaoRegistrada = false;

function escapeHtml(texto) {
    return String(texto ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function formatarPreco(valor) {
    const numero = Number(valor);
    if (!Number.isFinite(numero)) return 'Preço a combinar';
    return `${numero.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        maximumFractionDigits: 0,
    })}/mês`;
}

function obterImagemImovel(imovel) {
    const primeiraMidia = Array.isArray(imovel?.midia) ? imovel.midia[0] : null;
    const url = primeiraMidia?.url;
    if (!url) return './images/image1.jpeg';
    return url.startsWith('http') ? url : `${STRAPI_ORIGIN}${url}`;
}

function extrairDadosImovel(imovel) {
    const anuncio = Array.isArray(imovel?.anuncios) ? imovel.anuncios[0] : null;
    const endereco = imovel?.endereco || {};
    const titulo = anuncio?.titulo || imovel?.titulo || `Imóvel #${imovel?.id ?? ''}`.trim();
    const preco = formatarPreco(anuncio?.preco ?? imovel?.preco);

    const partesLocal = [endereco.bairro, endereco.cidade].filter(Boolean);
    const localizacao = partesLocal.length > 0 ? partesLocal.join(', ') : 'Quixadá - CE';

    const specs = [];
    if (imovel?.quartos != null) specs.push(`${imovel.quartos} quarto${imovel.quartos === 1 ? '' : 's'}`);
    if (imovel?.banheiros != null) specs.push(`${imovel.banheiros} banheiro${imovel.banheiros === 1 ? '' : 's'}`);
    if (imovel?.metragem != null) specs.push(`${imovel.metragem} m²`);

    return {
        imovelId: imovel?.documentId || (imovel?.id != null ? String(imovel.id) : ''),
        titulo,
        preco,
        localizacao,
        resumoSpecs: specs.join(' · '),
        imagemUrl: obterImagemImovel(imovel),
    };
}

function indexarFavoritos(lista) {
    mapaFavoritos.clear();
    for (const fav of lista) {
        const imovel = fav?.imovel;
        if (!imovel) continue;
        if (imovel.documentId) mapaFavoritos.set(String(imovel.documentId), fav);
        if (imovel.id != null) mapaFavoritos.set(String(imovel.id), fav);
    }
}

export async function listarFavoritos() {
    const token = obterToken();
    if (!token) {
        mapaFavoritos.clear();
        return [];
    }

    const query =
        'populate[imovel][populate][0]=anuncios' +
        '&populate[imovel][populate][1]=endereco' +
        '&populate[imovel][populate][2]=midia' +
        '&sort=createdAt:desc';

    const response = await fetch(`${API}/favoritos?${query}`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(payload?.error?.message || 'Não foi possível carregar seus favoritos.');
    }

    const lista = Array.isArray(payload?.data) ? payload.data : [];
    indexarFavoritos(lista);
    return lista;
}

export async function adicionarFavorito(imovelId) {
    const token = obterToken();
    if (!token) {
        throw new Error('Você precisa estar autenticado para favoritar um imóvel.');
    }

    const response = await fetch(`${API}/favoritos`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
            data: {
                imovel: imovelId,
            },
        }),
    });

    const payload = await response.json().catch(() => ({}));

    // Se já existir (409 Conflict), apenas sincroniza o estado
    if (response.status === 409) {
        await listarFavoritos();
        return { jaExistia: true };
    }

    if (!response.ok) {
        throw new Error(payload?.error?.message || 'Erro ao adicionar imóvel aos favoritos.');
    }

    const novoFav = payload?.data;
    if (novoFav?.imovel) {
        if (novoFav.imovel.documentId) mapaFavoritos.set(String(novoFav.imovel.documentId), novoFav);
        if (novoFav.imovel.id != null) mapaFavoritos.set(String(novoFav.imovel.id), novoFav);
    }
    mapaFavoritos.set(String(imovelId), novoFav);

    return { jaExistia: false, favorito: novoFav };
}

export async function removerFavorito(favoritoDocumentId, imovelId = null) {
    const token = obterToken();
    if (!token) {
        throw new Error('Você precisa estar autenticado para remover um favorito.');
    }

    const response = await fetch(`${API}/favoritos/${encodeURIComponent(favoritoDocumentId)}`, {
        method: 'DELETE',
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error?.message || 'Erro ao remover imóvel dos favoritos.');
    }

    for (const [chave, fav] of mapaFavoritos.entries()) {
        if (fav?.documentId === favoritoDocumentId || (imovelId && chave === String(imovelId))) {
            mapaFavoritos.delete(chave);
        }
    }
}

function exibirFeedback(mensagem, tipo = 'success') {
    const alvo = document.getElementById('feedback-favorito');
    if (!alvo) return;

    alvo.innerHTML = `
    <div class="alert alert-${tipo} alert-dismissible fade show py-2 px-3 small mb-0" role="alert">
      ${escapeHtml(mensagem)}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>
    </div>
  `;
}

function atualizarVisualBotao(botao, isFavoritado) {
    botao.dataset.favoritado = isFavoritado ? 'true' : 'false';
    botao.setAttribute('aria-pressed', isFavoritado ? 'true' : 'false');

    if (isFavoritado) {
        botao.classList.remove('btn-outline-success');
        botao.classList.add('btn-success');
        botao.textContent = '★ Favoritado';
    } else {
        botao.classList.remove('btn-success');
        botao.classList.add('btn-outline-success');
        botao.textContent = '☆ Favoritar';
    }
}

export function sincronizarBotoesFavorito() {
    const botoes = document.querySelectorAll('[data-btn-favorito]');
    botoes.forEach((botao) => {
        const imovelId = botao.dataset.imovelId?.trim();
        const isFavoritado = Boolean(imovelId && mapaFavoritos.has(imovelId));
        atualizarVisualBotao(botao, isFavoritado);
    });
}

async function buscarPrimeiroImovelReal() {
    try {
        const token = obterToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await fetch(`${API}/imovels?pagination[limit]=1`, { headers });
        if (!response.ok) return null;
        const payload = await response.json().catch(() => ({}));
        const primeiro = Array.isArray(payload?.data) ? payload.data[0] : null;
        return primeiro?.documentId || (primeiro?.id != null ? String(primeiro.id) : null);
    } catch {
        return null;
    }
}

async function vincularIdsBotoes() {
    const paginaAtual = obterPaginaAtual();
    const params = new URLSearchParams(window.location.search);
    const idDaUrl = params.get('id') || params.get('imovel');

    if (paginaAtual === 'detalhes.html') {
        const btnDetalhes = document.getElementById('btn-favoritar');
        if (btnDetalhes && !btnDetalhes.dataset.imovelId?.trim() && idDaUrl) {
            btnDetalhes.dataset.imovelId = idDaUrl;
        }
    }

    // Fallback para cards de demonstração que ainda não receberam data-imovel-id dinâmico
    const botoesSemId = Array.from(document.querySelectorAll('[data-btn-favorito]')).filter(
        (btn) => !btn.dataset.imovelId?.trim()
    );

    if (botoesSemId.length > 0) {
        const fallbackId = await buscarPrimeiroImovelReal();
        if (fallbackId) {
            botoesSemId.forEach((btn) => {
                btn.dataset.imovelId = fallbackId;
            });
            document.querySelectorAll('[data-link-detalhes-demo]').forEach((link) => {
                link.setAttribute('href', `./detalhes.html?id=${encodeURIComponent(fallbackId)}`);
            });
        }
    }
}

async function tratarCliqueFavorito(botao) {
    const token = obterToken();
    if (!token) {
        const paginaAtual = obterPaginaAtual();
        const query = window.location.search || '';
        const destino = encodeURIComponent(`${paginaAtual}${query}`);
        window.location.href = `./login.html?redirect=${destino}`;
        return;
    }

    let imovelId = botao.dataset.imovelId?.trim();
    if (!imovelId) {
        imovelId = await buscarPrimeiroImovelReal();
        if (imovelId) botao.dataset.imovelId = imovelId;
    }

    if (!imovelId) {
        exibirFeedback(
            'Nenhum imóvel cadastrado foi encontrado no servidor para favoritar. Cadastre e publique um imóvel no Strapi primeiro.',
            'warning'
        );
        return;
    }

    const textoOriginal = botao.textContent;
    botao.disabled = true;
    botao.textContent = 'Salvando...';

    try {
        const favoritoAtual = mapaFavoritos.get(imovelId);
        if (favoritoAtual?.documentId) {
            await removerFavorito(favoritoAtual.documentId, imovelId);
            sincronizarBotoesFavorito();
            exibirFeedback('Imóvel removido dos seus favoritos.', 'secondary');
        } else {
            const resultado = await adicionarFavorito(imovelId);
            sincronizarBotoesFavorito();
            exibirFeedback(
                resultado.jaExistia
                    ? 'Este imóvel já estava salvo nos seus favoritos.'
                    : 'Imóvel salvo nos seus favoritos!',
                'success'
            );
        }
    } catch (error) {
        botao.textContent = textoOriginal;
        exibirFeedback(error.message || 'Erro ao atualizar favorito.', 'danger');
    } finally {
        botao.disabled = false;
    }
}

export async function inicializarFavoritos(usuarioAtual) {
    await vincularIdsBotoes();

    if (usuarioAtual) {
        try {
            await listarFavoritos();
        } catch (error) {
            console.error('Erro ao carregar favoritos:', error.message);
        }
    } else {
        mapaFavoritos.clear();
    }

    sincronizarBotoesFavorito();

    if (!delegacaoRegistrada) {
        delegacaoRegistrada = true;

        document.addEventListener('click', (event) => {
            const botao = event.target.closest('[data-btn-favorito]');
            if (!botao) return;
            event.preventDefault();
            tratarCliqueFavorito(botao);
        });

        // Sincroniza favoritos mesmo ao voltar pela seta do navegador (bfcache)
        window.addEventListener('pageshow', async (event) => {
            if (!event.persisted) return;

            const containerPerfil = document.getElementById('perfil-favoritos');
            if (containerPerfil) {
                await renderizarFavoritosNoPerfil(containerPerfil);
                return;
            }

            if (obterToken()) {
                try {
                    await listarFavoritos();
                } catch (error) {
                    console.error('Erro ao sincronizar favoritos:', error.message);
                }
            } else {
                mapaFavoritos.clear();
            }

            sincronizarBotoesFavorito();
        });
    }
}

export async function renderizarFavoritosNoPerfil(container) {
    if (!container) return;

    container.innerHTML = '<p class="text-secondary small mb-0">Carregando seus favoritos...</p>';

    try {
        const favoritos = await listarFavoritos();

        if (favoritos.length === 0) {
            container.innerHTML = `
        <div class="text-center py-3">
          <p class="text-secondary mb-2">Você ainda não favoritou nenhum imóvel.</p>
          <a href="./index.html" class="btn btn-sm btn-outline-success">Explorar imóveis</a>
        </div>
      `;
            return;
        }

        const itensHtml = favoritos
            .map((fav) => {
                const dados = extrairDadosImovel(fav.imovel || {});
                const linkDetalhes = dados.imovelId
                    ? `./detalhes.html?id=${encodeURIComponent(dados.imovelId)}`
                    : './detalhes.html';

                return `
          <article class="border rounded p-2 d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-3 bg-white">
            <div class="d-flex align-items-center gap-3">
              <img src="${escapeHtml(dados.imagemUrl)}" alt="${escapeHtml(dados.titulo)}" class="favorito-thumb">
              <div>
                <h3 class="h6 fw-bold mb-1">${escapeHtml(dados.titulo)}</h3>
                <p class="text-success fw-bold small mb-0">${escapeHtml(dados.preco)}</p>
                <p class="text-secondary small mb-0">${escapeHtml(dados.localizacao)}</p>
                ${dados.resumoSpecs ? `<p class="text-muted small mb-0">${escapeHtml(dados.resumoSpecs)}</p>` : ''}
              </div>
            </div>
            <div class="d-flex gap-2 flex-shrink-0">
              <a href="${linkDetalhes}" class="btn btn-sm btn-outline-success">Ver detalhes</a>
              <button
                type="button"
                class="btn btn-sm btn-outline-danger"
                data-remover-favorito="${escapeHtml(fav.documentId)}"
                data-imovel-id="${escapeHtml(dados.imovelId)}"
              >
                Remover
              </button>
            </div>
          </article>
        `;
            })
            .join('');

        container.innerHTML = `<div class="d-flex flex-column gap-2">${itensHtml}</div>`;

        container.querySelectorAll('[data-remover-favorito]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const favDocId = btn.dataset.removerFavorito;
                const imovelId = btn.dataset.imovelId;
                btn.disabled = true;
                btn.textContent = 'Removendo...';

                try {
                    await removerFavorito(favDocId, imovelId);
                    await renderizarFavoritosNoPerfil(container);
                } catch (error) {
                    btn.disabled = false;
                    btn.textContent = 'Remover';
                    alert(error.message || 'Erro ao remover favorito.');
                }
            });
        });
    } catch (error) {
        container.innerHTML = `
      <div class="alert alert-danger py-2 px-3 small mb-0 d-flex justify-content-between align-items-center gap-2">
        <span>${escapeHtml(error.message || 'Erro ao carregar favoritos.')}</span>
        <button type="button" class="btn btn-sm btn-outline-danger" id="btn-tentar-favoritos">Tentar novamente</button>
      </div>
    `;
        document
            .getElementById('btn-tentar-favoritos')
            ?.addEventListener('click', () => renderizarFavoritosNoPerfil(container));
    }
}