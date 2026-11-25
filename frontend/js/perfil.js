import { protegerPagina, encerrarSessao } from './auth.js';
import { renderizarFavoritosNoPerfil } from './favoritos.js';

document.addEventListener('DOMContentLoaded', async () => {
    const user = await protegerPagina();
    if (!user) return;

    const conteudo = document.getElementById('conteudo-perfil');
    if (conteudo) {
        conteudo.classList.remove('d-none');
    }

    const nome = user.nome || '';
    const sobrenome = user.sobrenome || '';
    const nomeCompleto = `${nome} ${sobrenome}`.trim() || user.username;
    const iniciais =
        `${nome.charAt(0)}${sobrenome.charAt(0)}`.toUpperCase() ||
        user.username.slice(0, 2).toUpperCase();
    const isAnunciante = user.tipo_perfil === 'ANUNCIANTE';

    document.getElementById('perfil-iniciais').textContent = iniciais;
    document.getElementById('perfil-nome-completo').textContent = nomeCompleto;
    document.getElementById('perfil-username').textContent = `@${user.username}`;

    const badge = document.getElementById('perfil-badge');
    badge.textContent = isAnunciante ? 'Anunciante' : 'Interessado';
    badge.className = `badge rounded-pill ${isAnunciante ? 'text-bg-success' : 'text-bg-secondary'}`;

    if (isAnunciante) {
        document.getElementById('btn-ir-painel')?.classList.remove('d-none');
    }

    document.getElementById('dados-nome').textContent = nome || '-';
    document.getElementById('dados-sobrenome').textContent = sobrenome || '-';
    document.getElementById('dados-username').textContent = user.username || '-';
    document.getElementById('dados-email').textContent = user.email || '-';
    document.getElementById('dados-telefone').textContent = user.telefone || '-';
    document.getElementById('dados-perfil').textContent = isAnunciante ? 'Anunciante' : 'Interessado';

    const btnLogout = document.getElementById('btn-logout-perfil');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => encerrarSessao('./index.html'));
    }

    const listaFavoritos = document.getElementById('perfil-favoritos');
    await renderizarFavoritosNoPerfil(listaFavoritos);
});