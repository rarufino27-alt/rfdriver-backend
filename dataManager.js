console.log("✅ DataManager carregado com sucesso");

const DataManager = {
  key: "rf_driver_data",

  /* ===============================
     BASE
  =============================== */
  getData() {
    const raw = localStorage.getItem(this.key);
    let data = raw ? JSON.parse(raw) : {};

    if (!Array.isArray(data.registros)) data.registros = [];
    if (!Array.isArray(data.pagamentos)) data.pagamentos = [];
    if (!Array.isArray(data.caixaFechado)) data.caixaFechado = [];

    if (!data.carteira) {
      data.carteira = {
        saldo: 0,
        historico: []
      };
    }

    if (!data.configuracoes) {
      data.configuracoes = {
        tema: localStorage.getItem("tema") || "dark"
      };
    }

    if (!data.metas) {
      data.metas = {}; // YYYY-MM
    }

    this.saveData(data);
    return data;
  },

  saveData(data) {
    localStorage.setItem(this.key, JSON.stringify(data));
  },

  gerarId() {
    return (
      Date.now().toString(36) +
      Math.random().toString(36).slice(2, 8)
    );
  },

  /* ===============================
     CARTEIRA
  =============================== */
  getSaldoCarteira() {
    return this.getData().carteira.saldo;
  },

  getHistoricoCarteira() {
    return this.getData().carteira.historico;
  },

  adicionarSaldoCarteira(valor, origem = "Fechamento de Caixa") {
    const data = this.getData();

    const v = Number(valor);
    if (!v || isNaN(v) || v <= 0) {
      return { ok: false, msg: "Valor inválido" };
    }

    data.carteira.saldo += v;

    data.carteira.historico.push({
      tipo: "entrada",
      valor: v,
      data: new Date().toISOString().split("T")[0],
      origem
    });

    data.caixaFechado.push({
      valor: v,
      data: new Date().toISOString(),
      origem
    });

    this.saveData(data);
    return { ok: true };
  },

  limparCarteira() {
    const data = this.getData();

    data.carteira = {
      saldo: 0,
      historico: []
    };

    this.saveData(data);
    return { ok: true };
  },

  /* ===============================
     META MENSAL
  =============================== */
  setMetaMensal(valor, mesAno) {
    const data = this.getData();
    data.metas[mesAno] = Number(valor);
    this.saveData(data);
  },

  getMetaMensal(mesAno) {
    return this.getData().metas[mesAno] || 0;
  }
};

/* ===============================
   PLANO / ACESSO
=============================== */
const PlanoManager = {
  getPlano() {
    return localStorage.getItem("planoUsuario") || "freemium";
  },

  setPlano(plano) {
    localStorage.setItem("planoUsuario", plano);

    if (plano === "freemium") {
      if (!localStorage.getItem("inicioTeste")) {
        localStorage.setItem("inicioTeste", new Date().toISOString());
      }
    } else {
      localStorage.removeItem("inicioTeste");
    }
  },

  isTesteAtivo() {
    const inicio = localStorage.getItem("inicioTeste");
    if (!inicio) return false;

    const diffHoras =
      (new Date() - new Date(inicio)) / (1000 * 60 * 60);

    return diffHoras <= 36;
  },

  temAcessoTotal() {
    const plano = this.getPlano();
    return plano !== "freemium" || this.isTesteAtivo();
  }
};

/* ===============================
   FREEMIUM
=============================== */
const PaginasLiberadasFreemium = [
  "entradas.html"
];

/* ===============================
   UTIL
=============================== */
DataManager.formatarDataCurta = function (data) {
  const d = new Date(data);
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const ano = String(d.getFullYear()).slice(-2);
  return `${dia}/${mes}/${ano}`;
};

/* ===============================
   REGISTRO DE DESPESAS / DÍVIDAS
=============================== */
DataManager.adicionarRegistro = function (registro) {
  const data = this.getData();

  const novoRegistro = {
    id: this.gerarId(),
    categoria: registro.categoria,
    descricao: registro.descricao,
    tipo: registro.tipo, // despesa | divida
    valor: Number(registro.valorParcela),
    parcelas: registro.totalParcelas,
    dataBase: registro.dataBase,
    criadoEm: new Date().toISOString(),
    status: "aberto"
  };

  data.registros.push(novoRegistro);

  this.saveData(data);

  return { ok: true, registro: novoRegistro };
};

/* =========================
   TEMA GLOBAL
========================= */
window.GlobalTheme = {
  init(){
    const tema = localStorage.getItem("tema") || "dark";
    document.body.setAttribute("data-theme", tema);
  },

  toggle(){
    const atual = document.body.getAttribute("data-theme") || "dark";
    const novo = atual === "dark" ? "light" : "dark";
    document.body.setAttribute("data-theme", novo);
    localStorage.setItem("tema", novo);
  }
};
