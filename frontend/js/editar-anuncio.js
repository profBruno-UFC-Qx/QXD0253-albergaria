import { API, obterToken } from "./auth.js";

const ORIGEM = API.replace(/\/api\/?$/, "");

const IDS = {
    titulo: "txtTitulo",
    descricao: "txaDescricao",
    preco: "nbrPreco",
    tbodyImovel: "tbody-selecao-imoveis",
};

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

function blocksParaTexto(blocks) {
    if (typeof blocks === "string") return blocks;
    if (!Array.isArray(blocks)) return "";
    return blocks
        .map((bloco) =>
            (bloco.children ?? [])
                .map((filho) => filho.text ?? filho.children?.map((c) => c.text).join("") ?? "")
                .join("")
        )
        .join("\n");
}

function textoParaBlocks(texto) {
    return texto
        .split("\n")
        .map((linha) => linha.trim())
        .filter(Boolean)
        .map((linha) => ({ type: "paragraph", children: [{ type: "text", text: linha }] }));
}

function definirValor(id, valor) {
    const el = document.getElementById(id);
    if (el) el.value = valor ?? "";
}

function mensagemImovel(tbody, texto) {
    const td = criarElemento("td", {
        className: "text-center text-muted py-3",
        text: texto,
        attrs: { colspan: "3" },
    });
    tbody.replaceChildren(criarElemento("tr", {}, [td]));
}

function criarLinhaImovel(imovel) {
    const radioId = "radio-imovel-edicao";
    const foto = urlFoto(imovel);

    const radio = criarElemento("input", {
        className: "form-check-input",
        attrs: {
            type: "radio",
            name: "imovelSelecionado",
            id: radioId,
            value: imovel.documentId ?? String(imovel.id ?? ""),
            checked: true,
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

    return criarElemento("tr", {}, [tdRadio, tdFoto, tdNome]);
}

function preencherImovel(imovel) {
    const tbody = document.getElementById(IDS.tbodyImovel);
    if (!tbody) return;

    if (!imovel) {
        mensagemImovel(tbody, "Imóvel do anúncio não encontrado.");
        return;
    }
    tbody.replaceChildren(criarLinhaImovel(imovel));
}

function preencherFormulario(anuncio) {
    definirValor(IDS.titulo, anuncio.titulo);
    definirValor(IDS.descricao, blocksParaTexto(anuncio.descricao));
    definirValor(IDS.preco, anuncio.preco);
    preencherImovel(anuncio.imovel);
}

function configurarEnvio(id) {
    const form = document.getElementById("form-edit-anuncio");
    if (!form) return;

    const txtTitulo = document.getElementById(IDS.titulo);
    const txaDescricao = document.getElementById(IDS.descricao);
    const nbrPreco = document.getElementById(IDS.preco);
    const btnSubmit = document.getElementById("btnSubmit");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const titulo = txtTitulo?.value.trim() ?? "";
        const descricao = txaDescricao?.value.trim() ?? "";
        const preco = Number(nbrPreco?.value);

        if (!titulo) {
            alert("Informe o título do anúncio.");
            txtTitulo?.focus();
            return;
        }
        if (!descricao) {
            alert("Informe a descrição do anúncio.");
            txaDescricao?.focus();
            return;
        }
        if (!nbrPreco || nbrPreco.value.trim() === "" || preco <= 0) {
            alert("O preço deve ser maior que zero.");
            nbrPreco?.focus();
            return;
        }

        const token = obterToken();
        if (!token) {
            alert("Sua sessão expirou. Faça login novamente.");
            return;
        }

        if (btnSubmit) btnSubmit.disabled = true;
        const textoOriginal = btnSubmit?.textContent || "";
        if (btnSubmit) btnSubmit.textContent = "Salvando...";

        try {
            const resp = await fetch(`${API}/anuncios/${encodeURIComponent(id)}`, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    data: { titulo, descricao: textoParaBlocks(descricao), preco },
                }),
            });

            if (!resp.ok) {
                const corpo = await resp.json().catch(() => null);
                throw new Error(corpo?.error?.message || `Erro ${resp.status}`);
            }

            alert("Anúncio atualizado com sucesso!");
            window.location.href = "./painel.html";
        } catch (err) {
            console.error(err);
            alert(`Não foi possível salvar o anúncio: ${err.message}`);
        } finally {
            if (btnSubmit) {
                btnSubmit.disabled = false;
                btnSubmit.textContent = textoOriginal;
            }
        }
    });
}

export async function inicializarEditarAnuncio() {
    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) {
        alert("Anúncio não informado.");
        window.location.replace("./painel.html");
        return;
    }

    const token = obterToken();
    if (!token) return;

    configurarEnvio(id);

    try {
        const params = new URLSearchParams();
        params.set("populate[imovel][populate][0]", "midia");
        params.set("status", "draft");

        const resposta = await buscarJson(`${API}/anuncios/${encodeURIComponent(id)}?${params}`, token);
        preencherFormulario(resposta.data);
    } catch (err) {
        console.error(err);
        alert(`Não foi possível carregar o anúncio: ${err.message}`);
        window.location.replace("./painel.html");
    }
}