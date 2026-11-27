export const API = 'http://localhost:1337/api';

export async function registrarUsuario(nome, sobrenome, username, email, telefone, password, tipo_perfil) {
    try {
        const response = await fetch(`${API}/auth/local/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ nome, sobrenome, username, email, telefone, password, tipo_perfil }),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error?.message || 'Erro ao cadastrar usuário');
        }
        return data;
    } catch (error) {
        console.error('Erro no cadastro:', error.message);
        throw error;
    }
}

export async function fazerLogin(identifier, password) {
    try {
        const response = await fetch(`${API}/auth/local`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ identifier, password }),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error?.message || 'Credenciais inválidas');
        }
        localStorage.setItem('jwt', data.jwt);
        localStorage.setItem('user', JSON.stringify(data.user));
        return data;
    } catch (error) {
        console.error('Erro de login:', error.message);
        throw error;
    }
}

export async function verificarAutenticacao() {
    const token = localStorage.getItem('jwt');
    if (!token) {
        return null;
    }
    try {
        const response = await fetch(`${API}/users/me`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        if (!response.ok) {
            fazerLogout();
            return null;
        }
        const user = await response.json();
        localStorage.setItem('user', JSON.stringify(user));
        return user;
    } catch (error) {
        console.error('Erro ao verificar sessão:', error);
        return null;
    }
}

export function fazerLogout() {
    localStorage.removeItem('jwt');
    localStorage.removeItem('user');
}

export function obterToken() {
    return localStorage.getItem('jwt');
}

export function obterUsuarioLocal() {
    try {
        const raw = localStorage.getItem('user');
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export function encerrarSessao(destino = './login.html') {
    fazerLogout();
    window.location.replace(destino);
}

export function obterPaginaAtual() {
    const pathname = window.location.pathname.replace(/\/+$/, '');
    const ultimaParte = pathname.split('/').pop() || 'index.html';
    return ultimaParte.includes('.') ? ultimaParte : `${ultimaParte}.html`;
}

export function obterDestinoPorPerfil(user) {
    if (user?.tipo_perfil === 'ANUNCIANTE') {
        return "./painel.html";
    }
    return 'index.html';
}

export function obterDestinoPosLogin(user) {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get('redirect');

    // Aceita apenas redirecionamento interno seguro (ex.: perfil.html, detalhes.html)
    if (redirect && /^[a-zA-Z0-9_-]+\.html(\?.*)?$/.test(redirect)) {
        if (redirect.startsWith('painel.html') && user?.tipo_perfil !== 'ANUNCIANTE') {
            return './perfil.html';
        }
        return `./${redirect}`;
    }

    return obterDestinoPorPerfil(user);
}

export async function protegerPagina({ perfisPermitidos = null } = {}) {
    const user = await verificarAutenticacao();

    if (!user) {
        const paginaAtual = obterPaginaAtual();
        const query = window.location.search || '';
        const destinoRetorno = encodeURIComponent(`${paginaAtual}${query}`);
        window.location.replace(`./login.html?redirect=${destinoRetorno}`);
        return null;
    }

    if (Array.isArray(perfisPermitidos) && !perfisPermitidos.includes(user.tipo_perfil)) {
        alert('Você não tem permissão para acessar esta página com o seu perfil.');
        window.location.replace(user.tipo_perfil === 'ANUNCIANTE' ? './painel.html' : './perfil.html');
        return null;
    }

    return user;
}

export async function redirecionarSeAutenticado() {
    const user = await verificarAutenticacao();
    if (user) {
        window.location.replace(obterDestinoPorPerfil(user));
        return user;
    }
    return null;
}

export function atualizarCabecalhoAuth(user) {
    const container =
        document.getElementById('nav-auth') ||
        document.getElementById('anunciar');

    if (!container) {
        return;
    }

    container.className = 'd-flex align-items-center gap-2 flex-wrap';

    if (user) {
        const primeiroNome = user.nome || user.username || 'Usuário';
        const botaoPainel =
            user.tipo_perfil === 'ANUNCIANTE'
                ? '<a href="./painel.html" class="btn btn-sm btn-success">Painel do Anunciante</a>'
                : '';

        container.innerHTML = `
      ${botaoPainel}
      <a href="./perfil.html" class="btn btn-sm btn-outline-dark">Olá, ${primeiroNome}</a>
      <button type="button" id="btn-logout-nav" class="btn btn-sm btn-outline-danger">Sair</button>
    `;

        const btnLogout = document.getElementById('btn-logout-nav');
        if (btnLogout) {
            btnLogout.addEventListener('click', () => encerrarSessao('./index.html'));
        }
    } else {
        container.innerHTML = `
      <a href="./painel.html" class="btn btn-sm btn-outline-dark">Anunciar Imóvel</a>
      <a href="./login.html" class="btn btn-sm btn-outline-success">Entrar</a>
      <a href="./cadastro.html" class="btn btn-sm btn-success">Cadastrar</a>
    `;
    }
}