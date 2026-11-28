import { API, obterToken } from "./auth.js";
const API_URL = `${API}/imovels`;
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

export function inicializarCadastroImovel() {
    const form = document.getElementById("form-cad-imovel");
    if (!form) return;

    const txtTitulo = document.getElementById("txtTitulo");
    const selTipo = document.getElementById("selTipo");
    const selQuartos = document.getElementById("selQuartos");
    const selBanheiros = document.getElementById("selBanheiros");
    const txtMetragem = document.getElementById("txtMetragem");
    const selEstado = document.getElementById("selEstado");
    const selCidade = document.getElementById("selCidade");
    const txtLogradouro = document.getElementById("txtLogradouro");
    const txtBairro = document.getElementById("txtBairro");
    const inpLat = document.getElementById("latitude");
    const inpLng = document.getElementById("longitude");
    const dropzone = document.getElementById("dropzone");
    const fMidia = document.getElementById("fMidia");
    const btnSubmit = form.querySelector('button[type="submit"]');
    const preview = document.createElement("div");
    preview.className = "row g-2 mt-2";
    if (dropzone) dropzone.after(preview);
    let arquivos = [];
    let urlsAtivas = [];
    let mapa, marcador;

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
                    value: i,
                    text: i === 5 ? "5 ou mais" : String(i),
                }))
            );
        }
        if (selBanheiros) {
            preencherSelect(
                selBanheiros,
                Array.from({ length: 5 }, (_, i) => ({
                    value: i + 1,
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

    async function carregarCidades(uf) {
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
        } catch (err) {
            console.error("Erro ao carregar cidades:", err);
        } finally {
            selCidade.disabled = false;
        }
    }

    selEstado?.addEventListener("change", () => carregarCidades(selEstado.value));

    function initMapa() {
        const containerMapa = document.getElementById("map-marcador");
        if (!containerMapa || typeof L === "undefined") return;

        mapa = L.map(containerMapa).setView([-4.9714, -39.0153], 12);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "&copy; OpenStreetMap",
        }).addTo(mapa);

        mapa.on("click", (e) => {
            const { lat, lng } = e.latlng;
            if (marcador) marcador.setLatLng(e.latlng);
            else marcador = L.marker(e.latlng).addTo(mapa);
            if (inpLat) inpLat.value = lat.toFixed(7);
            if (inpLng) inpLng.value = lng.toFixed(7);
        });
    }

    function limparUrlsPreview() {
        urlsAtivas.forEach((url) => URL.revokeObjectURL(url));
        urlsAtivas = [];
    }

    function renderPreview() {
        limparUrlsPreview();
        const fragment = document.createDocumentFragment();

        arquivos.forEach((f, i) => {
            const col = document.createElement("div");
            col.className = "col-4 position-relative";

            const url = URL.createObjectURL(f);
            urlsAtivas.push(url);

            let midia;
            if (f.type.startsWith("video")) {
                midia = document.createElement("video");
                midia.src = url;
                midia.className = "img-fluid rounded";
                midia.muted = true;
            } else {
                midia = document.createElement("img");
                midia.src = url;
                midia.className = "img-fluid rounded";
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
            if (arquivos.length >= MAX_ARQUIVOS) {
                alert(`Máximo de ${MAX_ARQUIVOS} arquivos.`);
                break;
            }
            const duplicado = arquivos.some((a) => a.name === f.name && a.size === f.size);
            if (!duplicado) arquivos.push(f);
        }
        renderPreview();
    }

    preview.addEventListener("click", (e) => {
        const btn = e.target.closest("button[data-i]");
        if (!btn) return;
        arquivos.splice(Number(btn.dataset.i), 1);
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
        if (arquivos.length === 0) {
            alert("Adicione pelo menos uma foto ou vídeo.");
            return false;
        }
        return true;
    }

    function limparFormulario() {
        form.reset();
        arquivos = [];
        renderPreview();
        if (selCidade) preencherSelect(selCidade, [], "Selecione a cidade");
        if (inpLat) inpLat.value = "";
        if (inpLng) inpLng.value = "";
        if (marcador && mapa) {
            mapa.removeLayer(marcador);
            marcador = null;
        }
    }

    async function lerErro(resp) {
        const corpo = await resp.json().catch(() => null);
        return corpo?.error?.message || `Erro ${resp.status}`;
    }

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!validar()) return;

        const token = obterToken();
        if (!token) {
            alert("Sua sessão expirou. Faça login novamente.");
            return;
        }
        const authHeader = { Authorization: `Bearer ${token}` };

        if (btnSubmit) btnSubmit.disabled = true;
        const textoOriginal = btnSubmit?.textContent || "";
        if (btnSubmit) btnSubmit.textContent = "Cadastrando...";

        try {
            const up = new FormData();
            arquivos.forEach((f) => up.append("files", f));

            const rUp = await fetch(`${API}/upload`, {
                method: "POST",
                headers: authHeader,
                body: up,
            });
            
            if (!rUp.ok) throw new Error(`Upload das mídias: ${await lerErro(rUp)}`);

            const midias = await rUp.json();
            const resp = await fetch(API_URL, {
                method: "POST",
                headers: { ...authHeader, "Content-Type": "application/json" },
                body: JSON.stringify({
                    data: {
                        nome: txtTitulo.value.trim(),
                        tipo_imovel: selTipo.value,
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
                        midia: midias.map((m) => m.id),
                    },
                }),
            });
            if (!resp.ok) throw new Error(await lerErro(resp));

            alert("Imóvel cadastrado com sucesso!");
            limparFormulario();
        } catch (err) {
            console.error(err);
            alert(`Não foi possível cadastrar o imóvel: ${err.message}`);
        } finally {
            if (btnSubmit) {
                btnSubmit.disabled = false;
                btnSubmit.textContent = textoOriginal;
            }
        }
    });

    initSelects();
    carregarEstados();
    initMapa();
}