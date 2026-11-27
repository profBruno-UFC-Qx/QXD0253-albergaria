import { API, obterToken } from "./auth.js";
const API_URL = `${API}/anuncios`;

export function inicializarCadastroAnuncio() {
    const form = document.getElementById("form-cad-anuncio");
    if (!form) return;

    const txtTitulo = document.getElementById("txtTitulo");
    const txaDescricao = document.getElementById("txaDescricao");
    const nbrPreco = document.getElementById("nbrPreco");
    const btnSubmit = document.getElementById("btnSubmit");

    function validar() {
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

        const payload = {
            titulo: txtTitulo.value.trim(),
            descricao: txaDescricao.value.trim(),
            preco: Number(nbrPreco.value),
        };

        const dados = new FormData();
        dados.append(
            "data",
            new Blob([JSON.stringify(payload)], { type: "application/json" })
        );

        if (btnSubmit) btnSubmit.disabled = true;
        const textoOriginal = btnSubmit?.textContent || "";
        if (btnSubmit) btnSubmit.textContent = "Cadastrando...";

        try {
            const token = obterToken();
            const h = token ? { Authorization: `Bearer ${token}` } : {};
            const resp = await fetch(API_URL, {
                method: "POST",
                headers: h,
                body: dados,
            });

            if (!resp.ok) {
                const detalhe = await resp.text();
                throw new Error(`Erro ${resp.status}: ${detalhe}`);
            }

            alert("Anúncio cadastrado com sucesso!");
            form.reset();
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
}