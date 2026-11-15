// 1. Inicializa o mapa centralizado (ex: Quixadá)
const mapa = L.map('map').setView([-4.9714, -39.0153], 14);

// 2. Adiciona a camada visual do OpenStreetMap
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(mapa);

// 3. Lista de imóveis (poderia vir de uma API ou base de dados no futuro)
const imoveis = [
  { 
    lat: -4.9700, 
    lng: -39.0100, 
    titulo: "Apartamento no Centro", 
    preco: "R$ 1.250/mês" 
  },
  { 
    lat: -4.9750, 
    lng: -39.0200, 
    titulo: "Casa no Aeroporto", 
    preco: "R$ 1.800/mês" 
  },
  { 
    lat: -4.9680, 
    lng: -39.0250, 
    titulo: "Kitnet Universitária", 
    preco: "R$ 600/mês" 
  }
];

// 4. Percorre a lista e adiciona cada pin automaticamente no mapa
imoveis.forEach(imovel => {
  const marker = L.marker([imovel.lat, imovel.lng]).addTo(mapa);
  
  // Adiciona um balão informativo (popup) ao clicar no pin
  marker.bindPopup(`
    <div style="font-family: sans-serif;">
      <strong>${imovel.titulo}</strong><br>
      <span style="color: #1b4d3e; font-weight: bold;">${imovel.preco}</span>
    </div>
  `);
});