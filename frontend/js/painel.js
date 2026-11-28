import { API, obterToken } from "./auth.js";

const STATUS = {
  ATIVO: { texto: "Ativo", classe: "text-bg-success" },
  PAUSADO: { texto: "Pausado", classe: "text-bg-warning" },
  INDISPONIVEL: { texto: "Indisponível", classe: "text-bg-danger" },
  ALUGADO: { texto: "Alugado", classe: "text-bg-primary" },
  DISPONIVEL: { texto: "Disponível", classe: "text-bg-secondary" },
};

const STATUS_TABELA_PAINEL = new Set(["ATIVO", "PAUSADO"]);

const formatoMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 0,
});

function criarElemento(tag, { className = "", text = "", attrs = {} } = {}, filhos = []) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== "") el.textContent = text;
  for (const [chave, valor] of Object.entries(attrs)) {
    if (valor !== undefined && valor !== null) {
      el.setAttribute(chave, String(valor));
    }
  }
  if (filhos.length > 0) {
    el.append(...filhos);
  }
  return el;
}

async function buscarJson(url, token) {
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) {
    const corpo = await resp.json().catch(() => null);
    throw new Error(corpo?.error?.message || `Erro ${resp.status}`);
  }
  return resp.json();
}

function anuncioAtivoOuPausado(anuncio, imovel) {
  if (!anuncio) return false;

  const estadoAnuncio = String(
    anuncio.status_anuncio ?? anuncio.status ?? ""
  ).toUpperCase();

  if (estadoAnuncio === "ATIVO" || estadoAnuncio === "PAUSADO") {
    return true;
  }

  if (["INATIVO", "ENCERRADO", "ALUGADO", "INDISPONIVEL"].includes(estadoAnuncio)) {
    return false;
  }

  if (anuncio.ativo === true) {
    return ["ATIVO", "PAUSADO"].includes(imovel?.status_imovel);
  }

  if (anuncio.ativo === false) {
    return false;
  }

  return ["ATIVO", "PAUSADO"].includes(imovel?.status_imovel);
}

// Escolhe qual anúncio representa o imóvel na linha da tabela
function anuncioDe(imovel) {
  const anuncios = imovel.anuncios ?? [];
  const relevante = anuncios.find((a) => a.preco != null && anuncioAtivoOuPausado(a, imovel));
  return relevante ?? anuncios.find((a) => a.preco != null) ?? anuncios[0] ?? null;
}

function precoDe(imovel) {
  const anuncio = anuncioDe(imovel);
  return anuncio?.preco != null ? Number(anuncio.preco) : null;
}

function atualizarResumo(imoveis) {
  const elTotalImoveis = document.getElementById("total-imoveis");
  const elTotalAlugados = document.getElementById("total-alugados");
  const elTotalAtivos = document.getElementById("total-anuncios-ativos");

  const totalImoveis = new Set(imoveis.map((i) => i.documentId ?? i.id)).size;
  const totalAlugados = imoveis.filter((i) => i.status_imovel === "ALUGADO").length;

  let totalAnunciosAtivosEPausados = 0;
  for (const imovel of imoveis) {
    if (!STATUS_TABELA_PAINEL.has(imovel.status_imovel)) continue;

    const unicosDoImovel = new Map();
    for (const a of imovel.anuncios ?? []) {
      const chave = a.documentId ?? a.id;
      if (chave != null) unicosDoImovel.set(chave, a);
    }
    totalAnunciosAtivosEPausados += [...unicosDoImovel.values()].filter((a) =>
      anuncioAtivoOuPausado(a, imovel)
    ).length;
  }

  if (elTotalImoveis) elTotalImoveis.textContent = String(totalImoveis);
  if (elTotalAlugados) elTotalAlugados.textContent = String(totalAlugados);
  if (elTotalAtivos) elTotalAtivos.textContent = String(totalAnunciosAtivosEPausados);
}

function mensagemTabela(tbody, texto) {
  const td = criarElemento("td", {
    className: "text-center text-muted py-4",
    text: texto,
    attrs: { colspan: "5" },
  });
  tbody.replaceChildren(criarElemento("tr", {}, [td]));
}

function criarItemAcao(acao, id, iconeClasse, texto, extraClasse = "") {
  const icone = criarElemento("i", { className: `${iconeClasse} fa-fw me-2` });
  const botao = criarElemento(
    "button",
    {
      className: `dropdown-item ${extraClasse}`.trim(),
      attrs: { type: "button", "data-acao": acao, "data-id": id ?? "" },
    },
    [icone, texto]
  );
  return criarElemento("li", {}, [botao]);
}

function criarMenuAcoes(imovel, anuncio) {
  const imovelId = imovel.documentId ?? "";

  const btnToggle = criarElemento("button", {
    className: "btn btn-sm btn-outline-secondary dropdown-toggle",
    attrs: {
      type: "button",
      "data-bs-toggle": "dropdown",
      "aria-expanded": "false",
      "aria-label": "Ações",
    },
  });

  const itens = [
    criarItemAcao("editar", imovelId, "fa-regular fa-pen-to-square", "Editar imóvel"),
  ];
  // "Editar anúncio" só existe quando o imóvel tem anúncio
  if (anuncio?.documentId) {
    itens.push(
      criarItemAcao("editar-anuncio", anuncio.documentId, "fa-regular fa-pen-to-square", "Editar anúncio")
    );
  }
  itens.push(
    criarItemAcao("ver", imovelId, "fa-regular fa-eye", "Ver anúncio"),
    criarItemAcao("indisponivel", imovelId, "fa-regular fa-circle-xmark", "Marcar como indisponível"),
    criarItemAcao("alugado", imovelId, "fa fa-circle-check", "Marcar como alugado"),
    criarElemento("li", {}, [criarElemento("hr", { className: "dropdown-divider" })]),
    criarItemAcao("excluir", imovelId, "fa fa-trash", "Excluir imóvel", "text-danger")
  );

  const menu = criarElemento("ul", { className: "dropdown-menu dropdown-menu-end" }, itens);
  return criarElemento("div", { className: "dropdown" }, [btnToggle, menu]);
}

function criarLinhaPainel(imovel) {
  const statusInfo = STATUS[imovel.status_imovel] ?? {
    texto: imovel.status_imovel ?? "—",
    classe: "text-bg-secondary",
  };

  const end = imovel.endereco ?? {};
  const local =
    end.cidade && end.estado
      ? `${end.cidade} – ${end.estado}`
      : end.cidade || end.estado || "—";

  const preco = precoDe(imovel);
  const anuncio = anuncioDe(imovel);
  const textoPreco =
    preco != null
      ? criarElemento("span", { text: `${formatoMoeda.format(preco)}/mês` })
      : criarElemento("span", { className: "text-muted small", text: "Sem anúncio" });

  const badge = criarElemento("span", {
    className: `badge rounded-pill ${statusInfo.classe}`,
    text: statusInfo.texto,
  });

  const tr = criarElemento("tr", {}, [
    criarElemento("td", { text: imovel.nome ?? "—" }),
    criarElemento("td", { text: local }),
    criarElemento("td", {}, [textoPreco]),
    criarElemento("td", {}, [badge]),
    criarElemento("td", {}, [criarMenuAcoes(imovel, anuncio)]),
  ]);

  // Marca a linha para o duplo clique levar à edição do anúncio
  if (anuncio?.documentId) {
    tr.dataset.anuncioId = anuncio.documentId;
    tr.style.cursor = "pointer";
    tr.style.userSelect = "none";
    tr.title = "Clique duas vezes para editar o anúncio";
  }
  return tr;
}

function renderizarTabelaPainel(tbody, imoveis) {
  if (imoveis.length === 0) {
    mensagemTabela(tbody, "Nenhum imóvel ativo ou pausado no momento.");
    return;
  }

  const fragment = document.createDocumentFragment();
  imoveis.slice(0, 10).forEach((imovel) => {
    fragment.appendChild(criarLinhaPainel(imovel));
  });
  tbody.replaceChildren(fragment);
}

export async function inicializarPainel() {
  const tbody = document.getElementById("tbody-painel");
  if (!tbody) return;

  tbody.addEventListener("dblclick", (e) => {
    if (e.target.closest(".dropdown")) return; // duplo clique no menu não navega
    const linha = e.target.closest("tr[data-anuncio-id]");
    if (!linha) return;
    window.location.href = `./editar-anuncio.html?id=${encodeURIComponent(linha.dataset.anuncioId)}`;
  });

  tbody.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-acao]");
    if (!btn || !btn.dataset.id) return;
    const id = encodeURIComponent(btn.dataset.id);

    if (btn.dataset.acao === "editar") {
      window.location.href = `./editar-imovel.html?id=${id}`;
    } else if (btn.dataset.acao === "editar-anuncio") {
      window.location.href = `./editar-anuncio.html?id=${id}`;
    }
  });

  const token = obterToken();
  if (!token) return;

  mensagemTabela(tbody, "Carregando...");

  try {
    const me = await buscarJson(`${API}/users/me?populate=anunciante`, token);
    const anuncianteId = me.anunciante?.documentId;

    if (!anuncianteId) {
      atualizarResumo([]);
      mensagemTabela(tbody, "Seu usuário ainda não está vinculado a um anunciante.");
      return;
    }

    const paramsImoveis = new URLSearchParams();
    paramsImoveis.set("filters[anunciante][documentId][$eq]", anuncianteId);
    paramsImoveis.set("populate[0]", "endereco");
    paramsImoveis.set("populate[1]", "anuncios");
    paramsImoveis.set("sort", "createdAt:desc");
    paramsImoveis.set("status", "draft");
    paramsImoveis.set("pagination[pageSize]", "100");

    const paramsAnuncios = new URLSearchParams();
    paramsAnuncios.set("filters[imovel][anunciante][documentId][$eq]", anuncianteId);
    paramsAnuncios.set("populate[0]", "imovel");
    paramsAnuncios.set("status", "draft");
    paramsAnuncios.set("pagination[pageSize]", "100");

    const [respImoveis, respAnuncios] = await Promise.all([
      buscarJson(`${API}/imovels?${paramsImoveis}`, token),
      buscarJson(`${API}/anuncios?${paramsAnuncios}`, token).catch(() => ({ data: [] })),
    ]);

    const imoveis = respImoveis.data ?? [];
    const anuncios = respAnuncios.data ?? [];

    const anunciosPorImovel = new Map();
    for (const anuncio of anuncios) {
      const imovelDocId = anuncio.imovel?.documentId;
      if (!imovelDocId) continue;
      if (!anunciosPorImovel.has(imovelDocId)) {
        anunciosPorImovel.set(imovelDocId, []);
      }
      anunciosPorImovel.get(imovelDocId).push(anuncio);
    }

    const imoveisComAnuncios = imoveis.map((imovel) => {
      const vinculados = anunciosPorImovel.get(imovel.documentId);
      if (vinculados && vinculados.length > 0) {
        return { ...imovel, anuncios: vinculados };
      }
      return imovel;
    });

    atualizarResumo(imoveisComAnuncios);

    const imoveisFiltrados = imoveisComAnuncios.filter((imovel) =>
      STATUS_TABELA_PAINEL.has(imovel.status_imovel)
    );
    renderizarTabelaPainel(tbody, imoveisFiltrados);
  } catch (err) {
    console.error(err);
    mensagemTabela(tbody, `Não foi possível carregar os dados: ${err.message}`);
  }
}
