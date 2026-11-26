import { obterToken, obterPaginaAtual } from './auth.js';

const API = 'http://localhost:1337/api';

let imovelAtual = null;

function escapeHtml(texto) {
    return String(texto ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function limparDigitosTelefone(telefone) {
    return String(telefone ?? '').replace(/\D/g, '');
}

function montarLinkWhatsApp(telefone, tituloImovel) {
    const digitos = limparDigitosTelefone(telefone);
    if (!digitos) return '';
    const numeroComDdi = digitos.startsWith('55') ? digitos : `55${digitos}`;
    const mensagem = encodeURIComponent(
        `Olá! Tenho interesse no imóvel "${tituloImovel}" anunciado no Albergaria.`
    );
    return `https://wa.me/${numeroComDdi}?text=${mensagem}`;
}

function formatarDataBr(dataIso) {
    if (!dataIso) return '-';
    const apenasData = String(dataIso).slice(0, 10);
    const partes = apenasData.split('-');
    if (partes.length === 3) {
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return apenasData;
}

function obterDataHojeIso() {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

function extrairTituloImovel(imovel) {
    const anuncio = Array.isArray(imovel?.anuncios) ? imovel.anuncios[0] : null;
    return anuncio?.titulo || imovel?.titulo || `Imóvel #${imovel?.id ?? ''}`.trim();
}

function exibirAlerta(containerId, mensagem, tipo = 'success') {
    const alvo = document.getElementById(containerId);
    if (!alvo) return;
    alvo.innerHTML = `
    <div class="alert alert-${tipo} alert-dismissible fade show py-2 px-3 small mb-0" role="alert">
      ${escapeHtml(mensagem)}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>
    </div>
  `;
}

function obterUrlLoginComRetorno() {
    const paginaAtual = obterPaginaAtual();
    const query = window.location.search || '';
    const destino = encodeURIComponent(`${paginaAtual}${query}`);
    return `./login.html?redirect=${destino}`;
}

async function buscarImovelParaInteracao() {
    const token = obterToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const params = new URLSearchParams(window.location.search);
    const idDaUrl = params.get('id') || params.get('imovel');

    const queryPopulate = 'populate[0]=anuncios&populate[1]=endereco&populate[2]=anunciante';

    try {
        if (idDaUrl) {
            const resp = await fetch(`${API}/imovels/${encodeURIComponent(idDaUrl)}?${queryPopulate}`, {
                headers,
            });
            if (resp.ok) {
                const payload = await resp.json().catch(() => ({}));
                if (payload?.data) return payload.data;
            }
        }

        // Fallback: usa o primeiro imóvel publicado no Strapi para testes locais
        const respLista = await fetch(`${API}/imovels?pagination[limit]=1&${queryPopulate}`, {
            headers,
        });
        if (respLista.ok) {
            const payload = await respLista.json().catch(() => ({}));
            const primeiro = Array.isArray(payload?.data) ? payload.data[0] : null;
            if (primeiro) return primeiro;
        }
    } catch (error) {
        console.error('Erro ao buscar dados do imóvel para contato:', error);
    }

    return null;
}

export async function enviarContato({ imovelId, mensagem, canal = 'MENSAGEM', telefoneContato = '' }) {
    const token = obterToken();
    if (!token) {
        throw new Error('Você precisa estar autenticado para enviar um contato.');
    }

    const response = await fetch(`${API}/contatos`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
            data: {
                imovel: imovelId,
                mensagem,
                canal,
                telefone_contato: telefoneContato,
            },
        }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(payload?.error?.message || 'Não foi possível enviar sua mensagem.');
    }

    return payload?.data;
}

export async function solicitarVisita({
                                          imovelId,
                                          dataVisita,
                                          horario,
                                          telefoneContato = '',
                                          observacoes = '',
                                      }) {
    const token = obterToken();
    if (!token) {
        throw new Error('Você precisa estar autenticado para solicitar uma visita.');
    }

    const response = await fetch(`${API}/visitas`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
            data: {
                imovel: imovelId,
                data_visita: dataVisita,
                horario,
                telefone_contato: telefoneContato,
                observacoes,
            },
        }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(payload?.error?.message || 'Não foi possível enviar a solicitação de visita.');
    }

    return payload?.data;
}

export async function listarContatos() {
    const token = obterToken();
    if (!token) return [];

    const response = await fetch(`${API}/contatos`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(payload?.error?.message || 'Erro ao carregar seus contatos.');
    }

    return Array.isArray(payload?.data) ? payload.data : [];
}

export async function listarVisitas() {
    const token = obterToken();
    if (!token) return [];

    const response = await fetch(`${API}/visitas`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(payload?.error?.message || 'Erro ao carregar suas solicitações de visita.');
    }

    return Array.isArray(payload?.data) ? payload.data : [];
}

async function atualizarStatusVisita(documentId, novoStatus) {
    const token = obterToken();
    const response = await fetch(`${API}/visitas/${encodeURIComponent(documentId)}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ data: { status_visita: novoStatus } }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(payload?.error?.message || 'Erro ao atualizar status da visita.');
    }
}

async function atualizarStatusContato(documentId, novoStatus) {
    const token = obterToken();
    const response = await fetch(`${API}/contatos/${encodeURIComponent(documentId)}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ data: { status_contato: novoStatus } }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(payload?.error?.message || 'Erro ao atualizar status do contato.');
    }
}

async function excluirContato(documentId) {
    const token = obterToken();
    const response = await fetch(`${API}/contatos/${encodeURIComponent(documentId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error?.message || 'Erro ao remover contato.');
    }
}

function configurarCanaisDiretos(imovel, usuarioAtual) {
    const nomeEl = document.getElementById('anunciante-nome');
    const telefoneEl = document.getElementById('anunciante-telefone-texto');
    const btnWhatsapp = document.getElementById('btn-whatsapp-anunciante');
    const btnTelefone = document.getElementById('btn-telefone-anunciante');
    const avisoSemTelefone = document.getElementById('aviso-sem-telefone');

    const tituloImovel = extrairTituloImovel(imovel || {});
    const nomeAnunciante = imovel?.anunciante?.nome || 'Anunciante Albergaria';
    const telefoneAnunciante = imovel?.anunciante?.telefone || '';
    const digitos = limparDigitosTelefone(telefoneAnunciante);

    if (nomeEl) nomeEl.textContent = nomeAnunciante;

    if (digitos) {
        if (telefoneEl) telefoneEl.textContent = telefoneAnunciante;
        if (avisoSemTelefone) avisoSemTelefone.classList.add('d-none');

        if (btnWhatsapp) {
            btnWhatsapp.href = montarLinkWhatsApp(telefoneAnunciante, tituloImovel);
            btnWhatsapp.classList.remove('d-none');
            btnWhatsapp.addEventListener('click', () => {
                if (usuarioAtual && imovelAtual) {
                    const imovelId = imovelAtual.documentId || imovelAtual.id;
                    enviarContato({
                        imovelId,
                        canal: 'WHATSAPP',
                        mensagem: `Contato iniciado via WhatsApp sobre o imóvel "${tituloImovel}".`,
                        telefoneContato: usuarioAtual.telefone || '',
                    }).catch(() => {});
                }
            });
        }

        if (btnTelefone) {
            btnTelefone.href = `tel:${digitos}`;
            btnTelefone.classList.remove('d-none');
            btnTelefone.addEventListener('click', () => {
                if (usuarioAtual && imovelAtual) {
                    const imovelId = imovelAtual.documentId || imovelAtual.id;
                    enviarContato({
                        imovelId,
                        canal: 'TELEFONE',
                        mensagem: `Contato iniciado por ligação telefônica sobre o imóvel "${tituloImovel}".`,
                        telefoneContato: usuarioAtual.telefone || '',
                    }).catch(() => {});
                }
            });
        }
    } else {
        if (telefoneEl) telefoneEl.textContent = 'Não informado';
        if (btnWhatsapp) btnWhatsapp.classList.add('d-none');
        if (btnTelefone) btnTelefone.classList.add('d-none');
        if (avisoSemTelefone) avisoSemTelefone.classList.remove('d-none');
    }
}

export async function inicializarContatoEVisitas(usuarioAtual) {
    const btnInteresse = document.getElementById('btn-tenho-interesse');
    const painel = document.getElementById('painel-interesse');
    if (!btnInteresse || !painel) return;

    imovelAtual = await buscarImovelParaInteracao();
    configurarCanaisDiretos(imovelAtual, usuarioAtual);

    // Pré-preenche telefone e data mínima de visita
    const campoTelContato = document.getElementById('contato-telefone');
    const campoTelVisita = document.getElementById('visita-telefone');
    const campoDataVisita = document.getElementById('visita-data');

    if (usuarioAtual?.telefone) {
        if (campoTelContato) campoTelContato.value = usuarioAtual.telefone;
        if (campoTelVisita) campoTelVisita.value = usuarioAtual.telefone;
    }
    if (campoDataVisita) {
        campoDataVisita.min = obterDataHojeIso();
    }

    // Mostra aviso de login se o usuário for visitante
    const avisoLogin = document.getElementById('aviso-login-interesse');
    const linkLogin = document.getElementById('link-login-interesse');
    if (!usuarioAtual) {
        if (avisoLogin) avisoLogin.classList.remove('d-none');
        if (linkLogin) linkLogin.href = obterUrlLoginComRetorno();
    } else if (avisoLogin) {
        avisoLogin.classList.add('d-none');
    }

    // Abre/fecha o painel ao clicar em "Tenho interesse"
    btnInteresse.addEventListener('click', () => {
        painel.classList.toggle('d-none');
        if (!painel.classList.contains('d-none')) {
            painel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    });

    const btnFecharPainel = document.getElementById('btn-fechar-interesse');
    if (btnFecharPainel) {
        btnFecharPainel.addEventListener('click', () => {
            painel.classList.add('d-none');
        });
    }

    // Troca entre aba de Contato e aba de Visita
    const tabBtnContato = document.getElementById('tab-btn-contato');
    const tabBtnVisita = document.getElementById('tab-btn-visita');
    const abaContato = document.getElementById('aba-contato');
    const abaVisita = document.getElementById('aba-visita');

    function selecionarAba(aba) {
        const isContato = aba === 'contato';
        tabBtnContato?.classList.toggle('active', isContato);
        tabBtnVisita?.classList.toggle('active', !isContato);
        abaContato?.classList.toggle('d-none', !isContato);
        abaVisita?.classList.toggle('d-none', isContato);
    }

    tabBtnContato?.addEventListener('click', () => selecionarAba('contato'));
    tabBtnVisita?.addEventListener('click', () => selecionarAba('visita'));

    // Envio do formulário de Mensagem
    const formContato = document.getElementById('form-contato');
    formContato?.addEventListener('submit', async (event) => {
        event.preventDefault();

        if (!obterToken()) {
            window.location.href = obterUrlLoginComRetorno();
            return;
        }

        const imovelId = imovelAtual?.documentId || imovelAtual?.id;
        if (!imovelId) {
            exibirAlerta(
                'feedback-contato',
                'Nenhum imóvel cadastrado foi encontrado no servidor. Publique um imóvel no Strapi para enviar mensagens.',
                'warning'
            );
            return;
        }

        const mensagem = document.getElementById('contato-mensagem')?.value.trim() || '';
        const telefoneContato = document.getElementById('contato-telefone')?.value.trim() || '';

        if (!mensagem) {
            exibirAlerta('feedback-contato', 'Escreva uma mensagem antes de enviar.', 'warning');
            return;
        }

        const btnEnviar = document.getElementById('btn-enviar-contato');
        if (btnEnviar) {
            btnEnviar.disabled = true;
            btnEnviar.textContent = 'Enviando...';
        }

        try {
            await enviarContato({
                imovelId,
                mensagem,
                canal: 'MENSAGEM',
                telefoneContato,
            });
            document.getElementById('contato-mensagem').value = '';
            exibirAlerta(
                'feedback-contato',
                'Mensagem enviada ao anunciante! Você pode acompanhar no seu perfil.',
                'success'
            );
        } catch (error) {
            exibirAlerta('feedback-contato', error.message || 'Erro ao enviar mensagem.', 'danger');
        } finally {
            if (btnEnviar) {
                btnEnviar.disabled = false;
                btnEnviar.textContent = 'Enviar mensagem';
            }
        }
    });

    // Envio do formulário de Solicitação de Visita
    const formVisita = document.getElementById('form-visita');
    formVisita?.addEventListener('submit', async (event) => {
        event.preventDefault();

        if (!obterToken()) {
            window.location.href = obterUrlLoginComRetorno();
            return;
        }

        const imovelId = imovelAtual?.documentId || imovelAtual?.id;
        if (!imovelId) {
            exibirAlerta(
                'feedback-visita',
                'Nenhum imóvel cadastrado foi encontrado no servidor. Publique um imóvel no Strapi para agendar uma visita.',
                'warning'
            );
            return;
        }

        const dataVisita = document.getElementById('visita-data')?.value.trim() || '';
        const horario = document.getElementById('visita-horario')?.value.trim() || '';
        const telefoneContato = document.getElementById('visita-telefone')?.value.trim() || '';
        const observacoes = document.getElementById('visita-observacoes')?.value.trim() || '';

        if (!dataVisita || !horario) {
            exibirAlerta('feedback-visita', 'Informe a data e o horário desejados para a visita.', 'warning');
            return;
        }

        const btnEnviarVisita = document.getElementById('btn-enviar-visita');
        if (btnEnviarVisita) {
            btnEnviarVisita.disabled = true;
            btnEnviarVisita.textContent = 'Enviando...';
        }

        try {
            await solicitarVisita({
                imovelId,
                dataVisita,
                horario,
                telefoneContato,
                observacoes,
            });
            formVisita.reset();
            if (usuarioAtual?.telefone && campoTelVisita) {
                campoTelVisita.value = usuarioAtual.telefone;
            }
            exibirAlerta(
                'feedback-visita',
                'Solicitação de visita enviada! Acompanhe o status na sua tela de perfil.',
                'success'
            );
        } catch (error) {
            exibirAlerta('feedback-visita', error.message || 'Erro ao solicitar visita.', 'danger');
        } finally {
            if (btnEnviarVisita) {
                btnEnviarVisita.disabled = false;
                btnEnviarVisita.textContent = 'Solicitar visita';
            }
        }
    });
}

function classeBadgeStatusVisita(status) {
    switch (status) {
        case 'CONFIRMADA':
            return 'text-bg-success';
        case 'RECUSADA':
            return 'text-bg-danger';
        case 'CANCELADA':
            return 'text-bg-secondary';
        default:
            return 'text-bg-warning';
    }
}

function classeBadgeStatusContato(status) {
    switch (status) {
        case 'RESPONDIDO':
            return 'text-bg-success';
        case 'LIDO':
            return 'text-bg-info';
        default:
            return 'text-bg-primary';
    }
}

export async function renderizarInteracoesNoPerfil(container) {
    if (!container) return;

    container.innerHTML = '<p class="text-secondary small mb-0">Carregando seus contatos e visitas...</p>';

    try {
        const [visitas, contatos] = await Promise.all([listarVisitas(), listarContatos()]);

        if (visitas.length === 0 && contatos.length === 0) {
            container.innerHTML = `
        <div class="text-center py-3">
          <p class="text-secondary mb-2">Você ainda não enviou mensagens nem solicitou visitas.</p>
          <a href="./index.html" class="btn btn-sm btn-outline-success">Explorar imóveis</a>
        </div>
      `;
            return;
        }

        const visitasHtml =
            visitas.length === 0
                ? '<p class="text-secondary small mb-0">Nenhuma solicitação de visita registrada.</p>'
                : visitas
                    .map((v) => {
                        const titulo = extrairTituloImovel(v.imovel || {});
                        const imovelId = v.imovel?.documentId || v.imovel?.id || '';
                        const linkDetalhes = imovelId
                            ? `./detalhes.html?id=${encodeURIComponent(imovelId)}`
                            : './detalhes.html';
                        const podeCancelar =
                            v.eh_remetente && (v.status_visita === 'PENDENTE' || v.status_visita === 'CONFIRMADA');
                        const podeGerenciar = v.eh_anunciante && v.status_visita === 'PENDENTE';

                        return `
                <article class="border rounded p-2 bg-white">
                  <div class="d-flex justify-content-between align-items-start gap-2 flex-wrap">
                    <div>
                      <h4 class="h6 fw-bold mb-1">${escapeHtml(titulo)}</h4>
                      <p class="small mb-1">
                        <strong>Data:</strong> ${escapeHtml(formatarDataBr(v.data_visita))} às ${escapeHtml(v.horario || '-')}
                      </p>
                      ${
                            v.observacoes
                                ? `<p class="text-secondary small mb-1">${escapeHtml(v.observacoes)}</p>`
                                : ''
                        }
                      ${
                            v.telefone_contato
                                ? `<p class="text-muted small mb-0">Telefone: ${escapeHtml(v.telefone_contato)}</p>`
                                : ''
                        }
                    </div>
                    <span class="badge rounded-pill ${classeBadgeStatusVisita(v.status_visita)}">
                      ${escapeHtml(v.status_visita || 'PENDENTE')}
                    </span>
                  </div>
                  <div class="d-flex gap-2 mt-2 flex-wrap">
                    <a href="${linkDetalhes}" class="btn btn-sm btn-outline-success">Ver imóvel</a>
                    ${
                            podeGerenciar
                                ? `<button type="button" class="btn btn-sm btn-success" data-acao-visita="CONFIRMADA" data-visita-id="${escapeHtml(v.documentId)}">Confirmar</button>
                           <button type="button" class="btn btn-sm btn-outline-danger" data-acao-visita="RECUSADA" data-visita-id="${escapeHtml(v.documentId)}">Recusar</button>`
                                : ''
                        }
                    ${
                            podeCancelar
                                ? `<button type="button" class="btn btn-sm btn-outline-secondary" data-acao-visita="CANCELADA" data-visita-id="${escapeHtml(v.documentId)}">Cancelar visita</button>`
                                : ''
                        }
                  </div>
                </article>
              `;
                    })
                    .join('');

        const contatosHtml =
            contatos.length === 0
                ? '<p class="text-secondary small mb-0">Nenhuma mensagem enviada ou recebida.</p>'
                : contatos
                    .map((c) => {
                        const titulo = extrairTituloImovel(c.imovel || {});
                        const imovelId = c.imovel?.documentId || c.imovel?.id || '';
                        const linkDetalhes = imovelId
                            ? `./detalhes.html?id=${encodeURIComponent(imovelId)}`
                            : './detalhes.html';
                        const podeMarcarRespondido = c.eh_anunciante && c.status_contato !== 'RESPONDIDO';

                        return `
                <article class="border rounded p-2 bg-white">
                  <div class="d-flex justify-content-between align-items-start gap-2 flex-wrap">
                    <div>
                      <h4 class="h6 fw-bold mb-1">${escapeHtml(titulo)}</h4>
                      <p class="small mb-1">${escapeHtml(c.mensagem)}</p>
                      <p class="text-muted small mb-0">
                        Canal: <strong>${escapeHtml(c.canal || 'MENSAGEM')}</strong>
                        ${c.telefone_contato ? ` · Telefone: ${escapeHtml(c.telefone_contato)}` : ''}
                        ${c.createdAt ? ` · ${escapeHtml(formatarDataBr(c.createdAt))}` : ''}
                      </p>
                    </div>
                    <span class="badge rounded-pill ${classeBadgeStatusContato(c.status_contato)}">
                      ${escapeHtml(c.status_contato || 'NOVO')}
                    </span>
                  </div>
                  <div class="d-flex gap-2 mt-2 flex-wrap">
                    <a href="${linkDetalhes}" class="btn btn-sm btn-outline-success">Ver imóvel</a>
                    ${
                            podeMarcarRespondido
                                ? `<button type="button" class="btn btn-sm btn-success" data-responder-contato="${escapeHtml(c.documentId)}">Marcar respondido</button>`
                                : ''
                        }
                    <button type="button" class="btn btn-sm btn-outline-danger" data-excluir-contato="${escapeHtml(c.documentId)}">Remover</button>
                  </div>
                </article>
              `;
                    })
                    .join('');

        container.innerHTML = `
      <div class="d-flex flex-column gap-3">
        <div>
          <h3 class="h6 fw-bold text-dark mb-2">Solicitações de Visita (${visitas.length})</h3>
          <div class="d-flex flex-column gap-2">${visitasHtml}</div>
        </div>
        <div>
          <h3 class="h6 fw-bold text-dark mb-2">Mensagens e Contatos (${contatos.length})</h3>
          <div class="d-flex flex-column gap-2">${contatosHtml}</div>
        </div>
      </div>
    `;

        // Listeners das ações de visita
        container.querySelectorAll('[data-acao-visita]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const visitaId = btn.dataset.visitaId;
                const novoStatus = btn.dataset.acaoVisita;
                btn.disabled = true;
                try {
                    await atualizarStatusVisita(visitaId, novoStatus);
                    await renderizarInteracoesNoPerfil(container);
                } catch (error) {
                    btn.disabled = false;
                    alert(error.message || 'Erro ao atualizar visita.');
                }
            });
        });

        // Listeners de marcar contato respondido
        container.querySelectorAll('[data-responder-contato]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const contatoId = btn.dataset.responderContato;
                btn.disabled = true;
                try {
                    await atualizarStatusContato(contatoId, 'RESPONDIDO');
                    await renderizarInteracoesNoPerfil(container);
                } catch (error) {
                    btn.disabled = false;
                    alert(error.message || 'Erro ao atualizar contato.');
                }
            });
        });

        // Listeners de excluir contato
        container.querySelectorAll('[data-excluir-contato]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const contatoId = btn.dataset.excluirContato;
                btn.disabled = true;
                try {
                    await excluirContato(contatoId);
                    await renderizarInteracoesNoPerfil(container);
                } catch (error) {
                    btn.disabled = false;
                    alert(error.message || 'Erro ao remover contato.');
                }
            });
        });
    } catch (error) {
        container.innerHTML = `
      <div class="alert alert-danger py-2 px-3 small mb-0 d-flex justify-content-between align-items-center gap-2">
        <span>${escapeHtml(error.message || 'Erro ao carregar contatos e visitas.')}</span>
        <button type="button" class="btn btn-sm btn-outline-danger" id="btn-tentar-interacoes">Tentar novamente</button>
      </div>
    `;
        document
            .getElementById('btn-tentar-interacoes')
            ?.addEventListener('click', () => renderizarInteracoesNoPerfil(container));
    }
}