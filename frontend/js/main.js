import {
  registrarUsuario,
  fazerLogin,
  verificarAutenticacao,
  protegerPagina,
  redirecionarSeAutenticado,
  obterPaginaAtual,
  obterDestinoPosLogin,
  encerrarSessao,
  atualizarCabecalhoAuth,
} from './auth.js';

const elementoMapa = document.getElementById('map');
const mapDetalhes = document.getElementById('map-detalhes');

if (elementoMapa && typeof L !== 'undefined') {
  const mapa = L.map(elementoMapa).setView([-4.9714, -39.0153], 14);

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(mapa);

  const imoveis = [
    { lat: -4.9700, lng: -39.0100, titulo: 'Apartamento no Centro', preco: 'R$ 1.250/mês' },
    { lat: -4.9750, lng: -39.0200, titulo: 'Casa no Aeroporto', preco: 'R$ 1.800/mês' },
    { lat: -4.9680, lng: -39.0250, titulo: 'Kitnet Universitária', preco: 'R$ 600/mês' },
  ];

  imoveis.forEach((imovel) => {
    const marker = L.marker([imovel.lat, imovel.lng]).addTo(mapa);
    marker.bindPopup(`
      <div style="font-family: sans-serif;">
        <strong>${imovel.titulo}</strong><br>
        <span style="color: #1b4d3e; font-weight: bold;">${imovel.preco}</span>
      </div>
    `);
  });
}

if (mapDetalhes && typeof L !== 'undefined') {
  const mapa = L.map(mapDetalhes).setView([-4.9714, -39.0153], 14);

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(mapa);

  const imoveis = [
    { lat: -4.9700, lng: -39.0100, titulo: 'Apartamento no Centro', preco: 'R$ 1.250/mês' },
    { lat: -4.9750, lng: -39.0200, titulo: 'Casa no Aeroporto', preco: 'R$ 1.800/mês' },
    { lat: -4.9680, lng: -39.0250, titulo: 'Kitnet Universitária', preco: 'R$ 600/mês' },
  ];

  imoveis.forEach((imovel) => {
    const marker = L.marker([imovel.lat, imovel.lng]).addTo(mapa);
    marker.bindPopup(`
      <div style="font-family: sans-serif;">
        <strong>${imovel.titulo}</strong><br>
        <span style="color: #1b4d3e; font-weight: bold;">${imovel.preco}</span>
      </div>
    `);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  const paginaAtual = obterPaginaAtual();

  // Proteção do painel: apenas usuários autenticados com perfil ANUNCIANTE
  if (paginaAtual === 'painel.html') {
    const anunciante = await protegerPagina({ perfisPermitidos: ['ANUNCIANTE'] });
    if (!anunciante) return;

    const conteudoPainel = document.getElementById('conteudo-painel');
    if (conteudoPainel) {
      conteudoPainel.classList.remove('d-none');
    }

    const saudacao = document.getElementById('saudacao-anunciante');
    if (saudacao) {
      saudacao.textContent = `Olá, ${anunciante.nome || anunciante.username}!`;
    }

    const btnLogoutPainel = document.getElementById('btn-logout-painel');
    if (btnLogoutPainel) {
      btnLogoutPainel.addEventListener('click', () => encerrarSessao('./index.html'));
    }
    return;
  }

  // Se já estiver logado, redireciona ao acessar login ou cadastro
  if (paginaAtual === 'login.html' || paginaAtual === 'cadastro.html') {
    const jaLogado = await redirecionarSeAutenticado();
    if (jaLogado) return;
  }

  // Atualiza cabeçalho de autenticação nas páginas públicas/perfil
  const usuarioAtual = await verificarAutenticacao();
  atualizarCabecalhoAuth(usuarioAtual);

  const formCadastro = document.getElementById('form-cad');
  if (formCadastro) {
    formCadastro.addEventListener('submit', async (e) => {
      e.preventDefault();

      const nome = document.getElementById('txtNome').value;
      const sobrenome = document.getElementById('txtSobrenome').value;
      const username = document.getElementById('txtUsuario').value;
      const email = document.getElementById('txtEmail').value;
      const telefone = document.getElementById('txtTelefone').value;
      const password = document.getElementById('txtSenha').value;
      const tipo_perfil = document.getElementById('rdAnunciante').checked
          ? 'ANUNCIANTE'
          : 'COMUM';

      try {
        await registrarUsuario(nome, sobrenome, username, email, telefone, password, tipo_perfil);
        alert('Cadastro realizado com sucesso! Faça login para continuar.');
        formCadastro.reset();
        window.location.href = './login.html';
      } catch (error) {
        alert(`Falha no cadastro: ${error.message}`);
      }
    });
  }

  const formLogin = document.querySelector('form.formulario:not(#form-cad)');
  if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = document.getElementById('txtUsuario').value;
      const password = document.getElementById('txtSenha').value;

      try {
        const data = await fazerLogin(email, password);
        alert('Login realizado com sucesso!');
        window.location.href = obterDestinoPosLogin(data.user);
      } catch (error) {
        alert(`Falha no login: ${error.message}`);
      }
    });
  }
});