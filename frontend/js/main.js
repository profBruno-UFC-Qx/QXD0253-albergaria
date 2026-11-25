import { registrarUsuario, fazerLogin, verificarAutenticacao } from './auth.js';

const elementoMapa = document.getElementById('map');
const mapDetalhes = document.getElementById('map-detalhes');
const mapMarcador = document.getElementById('map-marcador');

if (elementoMapa) {
  const mapa = L.map(elementoMapa).setView([-4.9714, -39.0153], 14);

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(mapa);

  const imoveis = [
    { lat: -4.9700, lng: -39.0100, titulo: 'Apartamento no Centro', preco: 'R$ 1.250/mês' },
    { lat: -4.9750, lng: -39.0200, titulo: 'Casa no Aeroporto', preco: 'R$ 1.800/mês' },
    { lat: -4.9680, lng: -39.0250, titulo: 'Kitnet Universitária', preco: 'R$ 600/mês' }
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

if (mapDetalhes) {
  const mapa = L.map(mapDetalhes).setView([-4.9714, -39.0153], 14);

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(mapa);

  const imoveis = [
    { lat: -4.9700, lng: -39.0100, titulo: 'Apartamento no Centro', preco: 'R$ 1.250/mês' },
    { lat: -4.9750, lng: -39.0200, titulo: 'Casa no Aeroporto', preco: 'R$ 1.800/mês' },
    { lat: -4.9680, lng: -39.0250, titulo: 'Kitnet Universitária', preco: 'R$ 600/mês' }
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

if (mapMarcador) {
  const mapa = L.map(mapMarcador).setView([-4.9714, -39.0153], 14);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(mapa);
  let marcador;
  mapa.on('click', (e) =>{
    const {lat, lng} = e.latlng;
    document.getElementById('latitude').value = lat.toFixed(6);
    document.getElementById('longitude').value = lng.toFixed(6);
    if(marcador){
      marcador.setLatLng(e.latlng);
    }else{
      marcador = L.marker(e.latlng).addTo(mapa);
    }
  });
}


document.addEventListener('DOMContentLoaded', async () => {
  const usuarioAtual = await verificarAutenticacao();
  
  if (usuarioAtual) {
    console.log('Usuário logado:', usuarioAtual.username);
  } else {
    console.log('Nenhum usuário logado.');
  }

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
        await fazerLogin(email, password);
        alert('Login realizado com sucesso!');
        window.location.href = './index.html';
      } catch (error) {
        alert(`Falha no login: ${error.message}`);
      }
    });
  }
});

const selectEstado = document.getElementById('selEstado');
const selectCidade = document.getElementById('selCidade');
async function carregarEstados() {
  try {
    const response = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome');
    const estados = await response.json();
    selectEstado.innerHTML = '<option value="">Selecione um estado</option>';
    estados.forEach(estado => {
      const option = document.createElement('option');
      option.value = estado.sigla; 
      option.textContent = `${estado.nome} (${estado.sigla})`;
      selectEstado.appendChild(option);
    });
  } catch (error) {
    console.error('Erro ao carregar estados:', error);
    selectEstado.innerHTML = '<option value="">Erro ao carregar estados</option>';
  }
}

selectEstado.addEventListener('change', async (event) => {
  const uf = event.target.value;

  if (!uf) {
    selectCidade.innerHTML = '<option value="">Selecione um estado primeiro</option>';
    selectCidade.disabled = true;
    return;
  }

  selectCidade.innerHTML = '<option value="">Carregando cidades...</option>';
  selectCidade.disabled = true;
  try {
    const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`);
    const cidades = await response.json();

    selectCidade.innerHTML = '<option value="">Selecione uma cidade</option>';

    cidades.forEach(cidade => {
      const option = document.createElement('option');
      option.value = cidade.nome;
      option.textContent = cidade.nome;
      selectCidade.appendChild(option);
    });

    selectCidade.disabled = false;
  } catch (error) {
    console.error('Erro ao carregar cidades:', error);
    selectCidade.innerHTML = '<option value="">Erro ao carregar cidades</option>';
  }
});

carregarEstados();