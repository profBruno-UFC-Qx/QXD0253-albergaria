import { API, obterToken } from "./auth.js";

const API_IMOVEIS = `${API}/imovels`;
const ORIGEM = API.replace(/\/api\/?$/, "");
const MAX_ARQUIVOS = 10;
const MAX_TAMANHO_MB = 20;
const TIPOS_ACEITOS = ["image/jpeg", "image/png", "video/mp4"];
const TIPOS_IMOVEL = [
    "Apartamento",
    "Casa",
    "Casa em condomínio",
    "Kitnet / Studio",
    "Loft",
    "Cobertura",
    "Flat / Apart-hotel",
    "Quarto / República",
    "Sala comercial",
    "Ponto comercial / Loja",
    "Galpão / Depósito",
];

function preencherSelect(select, opcoes, placeholder = null) {
    const fragment = document.createDocumentFragment();

    if (placeholder) {
        const optPlaceholder = document.createElement("option");
        optPlaceholder.value = "";
        optPlaceholder.textContent = placeholder;
        fragment.appendChild(optPlaceholder);
    }

    opcoes.forEach(({ value, text }) => {
        const opt = document.createElement("option");
        opt.value = value;
        opt.textContent = text;
        fragment.appendChild(opt);
    });

    select.replaceChildren(fragment);
}

export function inicializarEditarImovel() {
    const form = document.getElementById("form-imovel");
    if (!form) return;

    const params = new URLSearchParams(window.location.search);
    const imovelId = params.get("id");
    if (!imovelId) {
        alert("Imóvel não informado.");
        window.location.replace("./imoveis.html");
        return;
    }

    const txtTitulo = document.getElementById("txtTitulo");
    const selTipo = document.getElementById("selTipo");
    const selQuartos = document.getElementById("selQuartos");
    const selBanheiros = document.getElementById("selBanheiros");
    const txtMetragem = document.getElementById("txtMetragem");
    const selCidade = document.getElementById("selCidade");
    const selEstado = document.getElementById("selEstado");
    const txtLogradouro = document.getElementById("txtLogradouro");
    const txtBairro = document.getElementById("txtBairro");
    const inpLat = document.getElementById("latitude");
    const inpLng = document.getElementById("longitude");
    const dropzone = document.getElementById("dropzone");
    const fMidia = document.getElementById("fMidia");
    const btnSubmit = form.querySelector('button[type="submit"]');

    const preview = document.createElement("div");
    preview.className = "row g-2 mt-2";
    const midiaExistente = document.createElement("div");
    midiaExistente.className = "row g-2 mt-2";
    if (dropzone) {
        dropzone.after(midiaExistente, preview);
    }

    let novosArquivos = [];
    let urlsAtivas = [];
    let midiaAtual = [];
    let mapa, marcador;

    function resolverUrlMidia(item) {
        const url = item?.formats?.medium?.url ?? item?.formats?.small?.url ?? item?.url;
        if (!url) return null;
        return url.startsWith("http") ? url : `${ORIGEM}${url}`;
    }

    function renderMidiaExistente() {
        if (midiaAtual.length === 0) {
            midiaExistente.replaceChildren();
            return;
        }

        const titulo = document.createElement("div");
        titulo.className = "col-12";
        const small = document.createElement("small");
        small.className = "text-muted fw-semibold";
        small.textContent = "Mídias atuais do imóvel:";
        titulo.appendChild(small);

        const fragment = document.createDocumentFragment();
        fragment.appendChild(titulo);

        midiaAtual.forEach((item, idx) => {
            const url = resolverUrlMidia(item);
            if (!url) return;

            const col = document.createElement("div");
            col.className = "col-4 position-relative";

            const el = item.mime?.startsWith("video")
                ? document.createElement("video")
                : document.createElement("img");
            el.src = url;
            el.className = "img-fluid rounded";
            if (item.mime?.startsWith("video")) {
                el.controls = true;
                el.muted = true;
            } else {
                el.alt = item.alternativeText || item.name || "Mídia do imóvel";
            }

            const btnRemover = document.createElement("button");
            btnRemover.type = "button";
            btnRemover.className = "btn btn-danger btn-sm position-absolute top-0 end-0 m-1";
            btnRemover.dataset.existenteIdx = String(idx);
            btnRemover.setAttribute("aria-label", "Remover mídia");
            btnRemover.textContent = "×";

            col.append(el, btnRemover);
            fragment.appendChild(col);
        });

        midiaExistente.replaceChildren(fragment);
    }

    midiaExistente.addEventListener("click", (e) => {
        const btn = e.target.closest("button[data-existente-idx]");
        if (!btn) return;
        const idx = Number(btn.dataset.existenteIdx);
        if (Number.isNaN(idx)) return;
        midiaAtual.splice(idx, 1);
        renderMidiaExistente();
    });

    function posicionarMarcador(lat, lng, centralizar = true) {
        if (!mapa || typeof L === "undefined") return;
        const latNum = Number(lat);
        const lngNum = Number(lng);
        if (Number.isNaN(latNum) || Number.isNaN(lngNum)) return;

        const latLng = [latNum, lngNum];
        if (marcador) {
            marcador.setLatLng(latLng);
        } else {
            marcador = L.marker(latLng).addTo(mapa);
        }

        if (inpLat) inpLat.value = latNum.toFixed(7);
        if (inpLng) inpLng.value = lngNum.toFixed(7);
        if (centralizar) mapa.setView(latLng, 15);
    }

    function initMapa() {
        const containerMapa = document.getElementById("map-marcador");
        if (!containerMapa || typeof L === "undefined") return;

        mapa = L.map(containerMapa).setView([-4.9714, -39.0153], 12);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "&copy; OpenStreetMap",
        }).addTo(mapa);

        mapa.on("click", (e) => {
            posicionarMarcador(e.latlng.lat, e.latlng.lng, false);
        });
    }

    function initSelects() {
        if (selTipo) {
            preencherSelect(
                selTipo,
                TIPOS_IMOVEL.map((t) => ({ value: t.toUpperCase(), text: t })),
                "Selecione"
            );
        }
        if (selQuartos) {
            preencherSelect(
                selQuartos,
                Array.from({ length: 6 }, (_, i) => ({
                    value: String(i),
                    text: i === 5 ? "5 ou mais" : String(i),
                }))
            );
        }
        if (selBanheiros) {
            preencherSelect(
                selBanheiros,
                Array.from({ length: 5 }, (_, i) => ({
                    value: String(i + 1),
                    text: i === 4 ? "5 ou mais" : String(i + 1),
                }))
            );
        }
    }

    async function carregarEstados() {
        if (!selEstado) return;
        try {
            const r = await fetch("https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome");
            const estados = await r.json();
            preencherSelect(
                selEstado,
                estados.map((e) => ({ value: e.sigla, text: e.nome })),
                "Selecione um estado"
            );
        } catch (err) {
            console.error("Erro ao carregar estados:", err);
        }
    }

    async function carregarCidades(uf, cidadeSelecionada = "") {
        if (!selCidade) return;
        preencherSelect(selCidade, [], "Selecione a cidade");
        if (!uf) return;
        selCidade.disabled = true;
        try {
            const r = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`);
            const cidades = await r.json();
            preencherSelect(
                selCidade,
                cidades.map((c) => ({ value: c.nome, text: c.nome })),
                "Selecione a cidade"
            );
            if (cidadeSelecionada) {
                selCidade.value = cidadeSelecionada;
            }
        } catch (err) {
            console.error("Erro ao carregar cidades:", err);
        } finally {
            selCidade.disabled = false;
        }
    }

    selEstado?.addEventListener("change", () => carregarCidades(selEstado.value));

    function limparUrlsPreview() {
        urlsAtivas.forEach((url) => URL.revokeObjectURL(url));
        urlsAtivas = [];
    }

    function renderPreview() {
        limparUrlsPreview();
        const fragment = document.createDocumentFragment();

        novosArquivos.forEach((f, i) => {
            const col = document.createElement("div");
            col.className = "col-4 position-relative";

            const url = URL.createObjectURL(f);
            urlsAtivas.push(url);

            const midia = f.type.startsWith("video")
                ? document.createElement("video")
                : document.createElement("img");
            midia.src = url;
            midia.className = "img-fluid rounded";
            if (f.type.startsWith("video")) {
                midia.muted = true;
            } else {
                midia.alt = f.name;
            }

            const btnRemover = document.createElement("button");
            btnRemover.type = "button";
            btnRemover.className = "btn btn-danger btn-sm position-absolute m-1";
            btnRemover.dataset.i = String(i);
            btnRemover.textContent = "×";

            col.append(midia, btnRemover);
            fragment.appendChild(col);
        });

        preview.replaceChildren(fragment);
    }

    function adicionarArquivos(lista) {
        for (const f of lista) {
            if (!TIPOS_ACEITOS.includes(f.type)) {
                alert(`"${f.name}" não é um formato aceito (JPG, PNG ou MP4).`);
                continue;
            }
            if (f.size > MAX_TAMANHO_MB * 1024 * 1024) {
                alert(`"${f.name}" ultrapassa ${MAX_TAMANHO_MB} MB.`);
                continue;
            }
            if (novosArquivos.length >= MAX_ARQUIVOS) {
                alert(`Máximo de ${MAX_ARQUIVOS} arquivos.`);
                break;
            }
            const duplicado = novosArquivos.some((a) => a.name === f.name && a.size === f.size);
            if (!duplicado) novosArquivos.push(f);
        }
        renderPreview();
    }

    preview.addEventListener("click", (e) => {
        const btn = e.target.closest("button[data-i]");
        if (!btn) return;
        novosArquivos.splice(Number(btn.dataset.i), 1);
        renderPreview();
    });

    fMidia?.addEventListener("change", () => {
        adicionarArquivos(fMidia.files);
        fMidia.value = "";
    });

    if (dropzone) {
        ["dragenter", "dragover"].forEach((ev) =>
            dropzone.addEventListener(ev, (e) => {
                e.preventDefault();
                dropzone.classList.add("border-success");
            })
        );
        ["dragleave", "drop"].forEach((ev) =>
            dropzone.addEventListener(ev, (e) => {
                e.preventDefault();
                dropzone.classList.remove("border-success");
            })
        );
        dropzone.addEventListener("drop", (e) => adicionarArquivos(e.dataTransfer.files));
    }

    async function carregarImovel() {
        const token = obterToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const params = new URLSearchParams();
        params.set("populate[0]", "midia");
        params.set("populate[1]", "endereco");
        params.set("status", "draft");

        const resp = await fetch(`${API_IMOVEIS}/${encodeURIComponent(imovelId)}?${params}`, {
            headers,
        });
        if (!resp.ok) {
            const detalhe = await resp.text();
            throw new Error(`Erro ${resp.status}: ${detalhe}`);
        }

        const json = await resp.json();
        const imovel = json.data;
        if (!imovel) throw new Error("Imóvel não encontrado.");

        if (txtTitulo) txtTitulo.value = imovel.nome ?? "";
        if (selTipo) selTipo.value = (imovel.tipo_imovel ?? "").toUpperCase();
        if (selQuartos) selQuartos.value = String(imovel.quartos ?? 0);
        if (selBanheiros) selBanheiros.value = String(imovel.banheiros ?? 1);
        if (txtMetragem) txtMetragem.value = imovel.metragem ?? "";

        const end = imovel.endereco ?? {};
        if (selEstado && end.estado) {
            selEstado.value = end.estado;
            await carregarCidades(end.estado, end.cidade ?? "");
        }
        if (txtLogradouro) txtLogradouro.value = end.logradouro ?? "";
        if (txtBairro) txtBairro.value = end.bairro ?? "";
        if (end.latitude != null && end.longitude != null) {
            posicionarMarcador(end.latitude, end.longitude, true);
        }
        midiaAtual = Array.isArray(imovel.midia) ? [...imovel.midia] : [];
        renderMidiaExistente();
    }

    function validar() {
        const obrigatorios = [
            [txtTitulo, "Informe o título do imóvel."],
            [selTipo, "Selecione o tipo do imóvel."],
            [selQuartos, "Selecione o número de quartos."],
            [selBanheiros, "Selecione o número de banheiros."],
            [txtMetragem, "Informe a metragem."],
            [selEstado, "Selecione o estado."],
            [selCidade, "Selecione a cidade."],
            [txtLogradouro, "Informe o logradouro."],
            [txtBairro, "Informe o bairro."],
        ];

        for (const [campo, msg] of obrigatorios) {
            if (!campo || !campo.value.trim()) {
                alert(msg);
                campo?.focus();
                return false;
            }
        }
        if (Number(txtMetragem.value) <= 0) {
            alert("A metragem deve ser maior que zero.");
            txtMetragem.focus();
            return false;
        }
        if (!inpLat?.value || !inpLng?.value) {
            alert("Clique no mapa para marcar a localização do imóvel.");
            return false;
        }
        return true;
    }

    async function enviarNovosArquivos(arquivos, token) {
        const formUpload = new FormData();
        arquivos.forEach((f) => formUpload.append("files", f));

        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const resp = await fetch(`${API}/upload`, {
            method: "POST",
            headers,
            body: formUpload,
        });

        if (!resp.ok) {
            const detalhe = await resp.text();
            throw new Error(`Erro no upload (${resp.status}): ${detalhe}`);
        }

        const enviados = await resp.json();
        const lista = Array.isArray(enviados) ? enviados : [];
        return lista.map((item) => item.documentId ?? item.id).filter(Boolean);
    }

    form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!validar()) return;

    if (btnSubmit) btnSubmit.disabled = true;
    const textoOriginal = btnSubmit?.textContent || "";
    if (btnSubmit) btnSubmit.textContent = "Salvando...";

    try {
        const token = obterToken();
        const headers = {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };

        const idsExistentes = midiaAtual
            .map((m) => m.documentId ?? m.id)
            .filter((v) => v !== undefined && v !== null);

        const idsNovos =
            novosArquivos.length > 0
                ? await enviarNovosArquivos(novosArquivos, token)
                : [];

        const payload = {
            nome: txtTitulo.value.trim(),
            quartos: Number(selQuartos.value),
            banheiros: Number(selBanheiros.value),
            metragem: Number(txtMetragem.value),
            endereco: {
                cidade: selCidade.value,
                bairro: txtBairro.value.trim(),
                estado: selEstado.value,
                logradouro: txtLogradouro.value.trim(),
                latitude: Number(inpLat.value),
                longitude: Number(inpLng.value),
            },
            tipo_imovel: selTipo.value.toUpperCase(),
            midia: [...idsExistentes, ...idsNovos],
        };

        const resp = await fetch(`${API_IMOVEIS}/${encodeURIComponent(imovelId)}`, {
            method: "PUT",
            headers,
            body: JSON.stringify({ data: payload }),
        });

        if (!resp.ok) {
            const detalhe = await resp.text();
            throw new Error(`Erro ${resp.status}: ${detalhe}`);
        }

        alert("Imóvel atualizado com sucesso!");
        window.location.href = "./imoveis.html";
    } catch (err) {
        console.error(err);
        alert(`Não foi possível atualizar o imóvel: ${err.message}`);
    } finally {
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.textContent = textoOriginal;
        }
    }
});

    (async () => {
        initSelects();
        initMapa();
        await carregarEstados();
        try {
            await carregarImovel();
        } catch (err) {
            console.error("Erro ao carregar dados do imóvel:", err);
            alert("Não foi possível carregar os dados do imóvel para edição.");
        }
    })();
}