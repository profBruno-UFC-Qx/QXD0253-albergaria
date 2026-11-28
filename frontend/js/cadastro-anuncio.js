import { API, obterToken } from "./auth.js";

const ORIGEM = API.replace(/\/api\/?$/, "");
const API_IMOVEIS = `${API}/imovels`;
const API_ANUNCIOS = `${API}/anuncios`;

function criarElemento(tag, { className = "", text = "", attrs = {} } = {}, filhos = []) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== "") el.textContent = text;
    for (const [chave, valor] of Object.entries(attrs)) {
        if (valor !== undefined && valor !== null) {
            if (chave === "checked") {
                el.checked = Boolean(valor);
            } else {
                el.setAttribute(chave, String(valor));
            }
        }
    }
    if (filhos.length > 0) {
        el.append(...filhos);
    }
    return el;
}

async function buscarJson(url, token) {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const resp = await fetch(url, { headers });
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

function mensagemTabela(tbody, texto) {
    const td = criarElemento("td", {
        className: "text-center text-muted py-3",
        text: texto,
        attrs: { colspan: "3" },
    });
    tbody.replaceChildren(criarElemento("tr", {}, [td]));
}

function criarLinhaSelecao(imovel, indice) {
    const valor = imovel.documentId ?? String(imovel.id ?? "");
    const radioId = `radio-imovel-${indice}`;
    const foto = urlFoto(imovel);

    const radio = criarElemento("input", {
        className: "form-check-input",
        attrs: {
            type: "radio",
            name: "imovelSelecionado",
            id: radioId,
            value: valor,
            "aria-label": `Selecionar ${imovel.nome ?? "imóvel"}`,
        },
    });

    const tdRadio = criarElemento("td", { className: "text-center" }, [radio]);

    const midiaEl = foto
        ? criarElemento("img", {
              className: "img-tabela rounded",
              attrs: { src: foto, alt: imovel.nome ?? "Foto do imóvel" },
          })
        : criarElemento("div", { className: "img-tabela bg-light rounded border" });

    const tdFoto = criarElemento("td", {}, [midiaEl]);

    const labelNome = criarElemento("label", {
        className: "form-check-label fw-semibold d-block cursor-pointer",
        text: imovel.nome ?? "Sem nome",
        attrs: { for: radioId },
    });

    const tdNome = criarElemento("td", {}, [labelNome]);

    const tr = criarElemento("tr", {}, [tdRadio, tdFoto, tdNome]);

    tr.addEventListener("click", (e) => {
        if (e.target !== radio && e.target !== labelNome) {
            radio.checked = true;
            radio.dispatchEvent(new Event("change", { bubbles: true }));
        }
    });

    return tr;
}

export function inicializarCadastroAnuncio() {
    const form = document.getElementById("form-cad-anuncio");
    if (!form) return;

    const tbody = document.getElementById("tbody-selecao-imoveis");
    const txtTitulo = document.getElementById("txtTitulo");
    const txaDescricao = document.getElementById("txaDescricao");
    const nbrPreco = document.getElementById("nbrPreco");
    const btnSubmit = document.getElementById("btnSubmit");

    let imoveisCarregados = [];

    function obterImovelSelecionado() {
        return form.querySelector('input[name="imovelSelecionado"]:checked')?.value ?? "";
    }

    async function carregarImoveisDoAnunciante() {
        if (!tbody) return;
        mensagemTabela(tbody, "Carregando imóveis...");

        try {
            const token = obterToken();
            if (!token) {
                mensagemTabela(tbody, "Faça login para ver seus imóveis.");
                return;
            }

            const me = await buscarJson(`${API}/users/me?populate=anunciante`, token);
            const anuncianteId = me.anunciante?.documentId;

            if (!anuncianteId) {
                mensagemTabela(tbody, "Seu usuário não está vinculado a um anunciante.");
                return;
            }

            const params = new URLSearchParams();
            params.set("filters[anunciante][documentId][$eq]", anuncianteId);
            params.set("populate[0]", "midia");
            params.set("sort", "createdAt:desc");
            params.set("status", "draft");
            params.set("pagination[pageSize]", "100");

            const resposta = await buscarJson(`${API_IMOVEIS}?${params}`, token);
            const lista = Array.isArray(resposta.data) ? resposta.data : [];
            imoveisCarregados = lista;

            if (lista.length === 0) {
                mensagemTabela(tbody, "Nenhum imóvel cadastrado.");
                return;
            }

            const fragment = document.createDocumentFragment();
            lista.forEach((imovel, idx) => {
                fragment.appendChild(criarLinhaSelecao(imovel, idx));
            });
            tbody.replaceChildren(fragment);
        } catch (err) {
            console.error("Erro ao carregar imóveis:", err);
            mensagemTabela(tbody, "Erro ao carregar imóveis.");
        }
    }

    function validar() {
        const imovelSelecionado = obterImovelSelecionado();
        if (!imovelSelecionado) {
            alert("Selecione um imóvel na tabela para anunciar.");
            tbody?.querySelector('input[name="imovelSelecionado"]')?.focus();
            return false;
        }

        const obrigatorios = [
            [txtTitulo, "Informe o título do anúncio."],
            [txaDescricao, "Informe a descrição do anúncio."],
        ];

        for (const [campo, msg] of obrigatorios) {
            if (!campo || !campo.value.trim()) {
                alert(msg);
                campo?.focus();
                return false;
            }
        }

        if (!nbrPreco || nbrPreco.value.trim() === "" || Number(nbrPreco.value) <= 0) {
            alert("O preço deve ser maior que zero.");
            nbrPreco?.focus();
            return false;
        }

        return true;
    }

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!validar()) return;

        const imovelDocId = obterImovelSelecionado();

        const payload = {
            titulo: txtTitulo.value.trim(),
            descricao: txaDescricao.value.trim(),
            preco: Number(nbrPreco.value),
            imovel: imovelDocId,
        };

        if (btnSubmit) btnSubmit.disabled = true;
        const textoOriginal = btnSubmit?.textContent || "";
        if (btnSubmit) btnSubmit.textContent = "Publicando...";

        try {
            const token = obterToken();
            const headers = {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            };

            const resp = await fetch(`${API_ANUNCIOS}?status=published`, {
                method: "POST",
                headers,
                body: JSON.stringify({ data: payload }),
            });

            if (!resp.ok) {
                const detalhe = await resp.text();
                throw new Error(`Erro ${resp.status}: ${detalhe}`);
            }

            const imovelSelecionado = imoveisCarregados.find(
                (im) => (im.documentId ?? String(im.id ?? "")) === imovelDocId
            );

            if (imovelSelecionado?.status_imovel === "DISPONIVEL") {
                const respStatus = await fetch(
                    `${API_IMOVEIS}/${encodeURIComponent(imovelDocId)}`,
                    {
                        method: "PUT",
                        headers,
                        body: JSON.stringify({ data: { status_imovel: "ATIVO" } }),
                    }
                );

                if (!respStatus.ok) {
                    const detalheStatus = await respStatus.text();
                    throw new Error(
                        `Erro ao atualizar status do imóvel (${respStatus.status}): ${detalheStatus}`
                    );
                }
            }

            alert("Anúncio cadastrado com sucesso!");
            window.location.href = "./painel.html";
        } catch (err) {
            console.error(err);
            alert("Não foi possível cadastrar o anúncio. Tente novamente.");
        } finally {
            if (btnSubmit) {
                btnSubmit.disabled = false;
                btnSubmit.textContent = textoOriginal;
            }
        }
    });

    carregarImoveisDoAnunciante();
}