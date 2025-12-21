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
      data.carteira = { saldo: 0, historico: [] };
    }

    if (!data.configuracoes) {
      data.configuracoes = {
        tema: localStorage.getItem("tema") || "dark"
      };
    }

    if (!data.metas) {
      data.metas = {};
    }

    this.saveData(data);
    return data;
  },

  saveData(data) {
    localStorage.setItem(this.key, JSON.stringify(data));
  },

  gerarId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
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
    if (isNaN(v) || v <= 0) {
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
  }
};
