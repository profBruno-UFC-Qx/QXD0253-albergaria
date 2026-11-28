import { API, obterToken } from "./auth.js";

const ORIGEM = API.replace(/\/api\/?$/, "");
const STATUS = {
    ATIVO: { texto: "Ativo", classe: "text-bg-success", filtro: "ativo" },
    DISPONIVEL: { texto: "Disponível", classe: "text-bg-success", filtro: "ativo" },
    INDISPONIVEL: { texto: "Indisponível", classe: "text-bg-danger", filtro: "indisponivel" },
    ALUGADO: { texto: "Alugado", classe: "text-bg-primary", filtro: "alugado" },
    PAUSADO: { texto: "Pausado", classe: "text-bg-warning", filtro: "pausado" },
};

function formatarPreco(valor) {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: Number.isInteger(valor) ? 0 : 2,
    }).format(valor);
}

function plural(n, singular, pluralTexto) {
    return `${n} ${Number(n) === 1 ? singular : pluralTexto}`;
}

let imoveis = [];

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
    const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!resp.ok) {
        const corpo = await resp.json().catch(() => null);
        throw new Error(corpo?.error?.message || `Erro ${resp.status}`);
    }
    return resp.json();
}

function urlFoto(imovel) {
    const foto = (imovel.midia ?? []).find((m) => m.mime?.startsWith("image"));
    if (!foto) return null;
    const url = foto.formats?.thumbnail?.url ?? foto.url;
    return url.startsWith("http") ? url : `${ORIGEM}${url}`;
}

function precoDe(imovel) {
    const anuncio = (imovel.anuncios ?? []).find((a) => a.preco != null);
    return anuncio ? Number(anuncio.preco) : null;
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

function criarLinha(imovel) {
    const status = STATUS[imovel.status_imovel] ?? {
        texto: imovel.status_imovel ?? "—",
        classe: "text-bg-secondary",
        filtro: "",
    };
    const foto = urlFoto(imovel);
    const preco = precoDe(imovel);
    const end = imovel.endereco ?? {};
    const local = [
        end.bairro,
        end.cidade && end.estado ? `${end.cidade} – ${end.estado}` : end.cidade,
    ]
        .filter(Boolean)
        .join(", ");
    const id = imovel.documentId ?? "";

    const midiaEl = foto
        ? criarElemento("img", {
              className: "img-tabela",
              attrs: { src: foto, alt: imovel.nome ?? "" },
          })
        : criarElemento("div", { className: "img-tabela bg-light rounded" });
    const tdFoto = criarElemento("td", {}, [midiaEl]);

    const specs = criarElemento("div", { className: "d-flex flex-wrap gap-2" }, [
        criarElemento("span", { className: "text-muted" }, [
            criarElemento("i", { className: "fa fa-bed" }),
            ` ${plural(imovel.quartos ?? 0, "quarto", "quartos")}`,
        ]),
        criarElemento("span", { className: "text-muted" }, [
            criarElemento("i", { className: "fa fa-bath me-1" }),
            plural(imovel.banheiros ?? 0, "banheiro", "banheiros"),
        ]),
        criarElemento("span", { className: "text-muted" }, [
            criarElemento("i", { className: "fa-regular fa-square me-1" }),
            ` ${imovel.metragem ?? ""} m²`,
        ]),
    ]);

    const tdInfo = criarElemento("td", {}, [
        criarElemento("div", { className: "fw-semibold", text: imovel.nome ?? "" }),
        criarElemento("small", { className: "text-muted", text: local }),
        specs,
    ]);

    const conteudoPreco =
        preco != null
            ? `${formatarPreco(preco)}/mês`
            : criarElemento("span", { className: "text-muted small", text: "Sem anúncio" });
    const tdPreco = criarElemento("td", {}, [conteudoPreco]);


    const badge = criarElemento("span", {
        className: `badge rounded-pill ${status.classe}`,
        text: status.texto,
    });
    const tdStatus = criarElemento("td", {}, [badge]);

    const btnToggle = criarElemento("button", {
        className: "btn btn-sm btn-outline-secondary dropdown-toggle",
        attrs: {
            type: "button",
            "data-bs-toggle": "dropdown",
            "aria-expanded": "false",
            "aria-label": "Ações",
        },
    });

    const menu = criarElemento("ul", { className: "dropdown-menu dropdown-menu-end" }, [
        criarItemAcao("editar", id, "fa-regular fa-pen-to-square", "Editar"),
        criarItemAcao("ver", id, "fa-regular fa-eye", "Ver anúncio"),
        criarItemAcao("indisponivel", id, "fa-regular fa-circle-xmark", "Marcar como indisponível"),
        criarItemAcao("alugado", id, "fa fa-circle-check", "Marcar como alugado"),
        criarElemento("li", {}, [criarElemento("hr", { className: "dropdown-divider" })]),
        criarItemAcao("excluir", id, "fa fa-trash", "Excluir imóvel", "text-danger"),
    ]);

    const tdAcoes = criarElemento("td", {}, [
        criarElemento("div", { className: "dropdown" }, [btnToggle, menu]),
    ]);

    return criarElemento("tr", {}, [tdFoto, tdInfo, tdPreco, tdStatus, tdAcoes]);
}

function mensagemTabela(tbody, texto) {
    const celula = criarElemento("td", {
        className: "text-center text-muted py-4",
        text: texto,
        attrs: { colspan: "5" },
    });
    tbody.replaceChildren(criarElemento("tr", {}, [celula]));
}

function renderizar(tbody, lista) {
    if (lista.length === 0) {
        mensagemTabela(tbody, "Nenhum imóvel encontrado.");
        return;
    }
    const fragment = document.createDocumentFragment();
    lista.forEach((imovel) => fragment.appendChild(criarLinha(imovel)));
    tbody.replaceChildren(fragment);
}

function aplicarFiltros(tbody) {
    const busca = (document.getElementById("filtroBusca")?.value ?? "").trim().toLowerCase();
    const status = document.getElementById("filtroStatus")?.value ?? "todos";
    const ordem = document.getElementById("ordenacao")?.value ?? "recentes";

    let lista = imoveis.filter((i) => {
        const texto = `${i.nome ?? ""} ${i.endereco?.bairro ?? ""}`.toLowerCase();
        const okBusca = !busca || texto.includes(busca);
        const okStatus = status === "todos" || STATUS[i.status_imovel]?.filtro === status;
        return okBusca && okStatus;
    });

    if (ordem === "maior-preco") {
        lista = [...lista].sort((a, b) => (precoDe(b) ?? -1) - (precoDe(a) ?? -1));
    } else if (ordem === "menor-preco") {
        lista = [...lista].sort(
            (a, b) => (precoDe(a) ?? Infinity) - (precoDe(b) ?? Infinity)
        );
    }

    renderizar(tbody, lista);
}

export async function inicializarMeusImoveis() {
    const tbody = document.getElementById("tbody-imoveis");
    if (!tbody) return;

    const token = obterToken();
    if (!token) return;

    mensagemTabela(tbody, "Carregando...");

    try {
        const me = await buscarJson(`${API}/users/me?populate=anunciante`, token);
        const anuncianteId = me.anunciante?.documentId;
        if (!anuncianteId) {
            mensagemTabela(tbody, "Seu usuário ainda não está vinculado a um anunciante.");
            return;
        }
        const params = new URLSearchParams();
        params.set("filters[anunciante][documentId][$eq]", anuncianteId);
        params.set("populate[0]", "midia");
        params.set("populate[1]", "endereco");
        params.set("populate[2]", "anuncios");
        params.set("sort", "createdAt:desc");
        params.set("status", "draft");
        params.set("pagination[pageSize]", "100");

        const resposta = await buscarJson(`${API}/imovels?${params}`, token);
        imoveis = resposta.data ?? [];
        aplicarFiltros(tbody);
    } catch (err) {
        console.error(err);
        mensagemTabela(tbody, `Não foi possível carregar os imóveis: ${err.message}`);
        return;
    }

    document.getElementById("formFiltros")?.addEventListener("submit", (e) => {
        e.preventDefault();
        aplicarFiltros(tbody);
    });
    document.getElementById("filtroBusca")?.addEventListener("input", () => aplicarFiltros(tbody));
    document.getElementById("filtroStatus")?.addEventListener("change", () => aplicarFiltros(tbody));
    document.getElementById("ordenacao")?.addEventListener("change", () => aplicarFiltros(tbody));
}