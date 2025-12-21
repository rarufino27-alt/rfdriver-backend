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
      data.metas = {}; // YYYY-MM
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
     REGISTRO DE DESPESA
  =============================== */
  adicionarRegistro({
    categoria,
    descricao,
    tipo,
    valorParcela,
    totalParcelas,
    dataBase
  }) {
    const data = this.getData();

    const recorrente = totalParcelas === null;

    const registro = {
      id: this.gerarId(),
      categoria,
      descricao: descricao.trim(),
      tipo,
      valorParcela: Number(valorParcela),
      totalParcelas,
      recorrente,
      dataBase,
      criadoEm: new Date().toISOString()
    };

    data.registros.push(registro);

    this.gerarPagamentos(registro, data);

    this.saveData(data);
  },

  /* ===============================
     GERA PAGAMENTOS
     REGRA: apenas ANO ATUAL
  =============================== */
 gerarPagamentos(registro, data) {
  const dataRegistro = new Date(registro.dataBase);
  const anoAtual = new Date().getFullYear();

  // Janeiro do ano atual, mantendo o dia original
  let dt = new Date(anoAtual, 0, dataRegistro.getDate());

  // Se o dia não existir no mês (ex: 31/02), ajusta automaticamente
  if (dt.getDate() !== dataRegistro.getDate()) {
    dt = new Date(anoAtual, 0 + 1, 0);
  }

  // RECORRENTE: Janeiro → Dezembro
  if (registro.recorrente) {
    while (dt.getFullYear() === anoAtual) {
      data.pagamentos.push(
        this._criarPagamento(
          registro,
          new Date(dt),
          "MENSAL"
        )
      );
      dt.setMonth(dt.getMonth() + 1);
    }
    return;
  }

  // PARCELADO (limitado ao ano)
  for (let i = 1; i <= registro.totalParcelas; i++) {
    if (dt.getFullYear() !== anoAtual) break;

    data.pagamentos.push(
      this._criarPagamento(
        registro,
        new Date(dt),
        `${i} de ${registro.totalParcelas}`
      )
    );
    dt.setMonth(dt.getMonth() + 1);
  }
},

  _criarPagamento(registro, dataVenc, parcelaInfo) {
    return {
      id: this.gerarId(),
      registroId: registro.id,
      descricao: registro.descricao,
      categoria: registro.categoria,
      tipo: registro.tipo,
      valor: registro.valorParcela,
      parcelaInfo,
      dataVencimento: dataVenc.toISOString().split("T")[0],
      pago: false,
      dataPagamento: null
    };
  },

  /* ===============================
     PAGAMENTOS
  =============================== */
  getPagamentos() {
    return this.getData().pagamentos;
  },

  marcarComoPago(id) {
    const data = this.getData();
    const pg = data.pagamentos.find(p => p.id === id);
    if (!pg || pg.pago) return;

    pg.pago = true;
    pg.dataPagamento = new Date().toISOString().split("T")[0];

    data.carteira.saldo -= pg.valor;
    data.carteira.historico.push({
      tipo: "saida",
      valor: pg.valor,
      data: pg.dataPagamento,
      origem: pg.descricao
    });

    this.saveData(data);
  },

  removerPorDescricao(descricao) {
    const data = this.getData();
    data.pagamentos = data.pagamentos.filter(p => p.descricao !== descricao);
    data.registros = data.registros.filter(r => r.descricao !== descricao);
    this.saveData(data);
  },

  /* ===============================
     CARTEIRA
  =============================== */
  adicionarSaldoCarteira(valor, origem = "Fechamento de Caixa") {
    const data = this.getData();
    const v = Number(valor);

    if (!v || v <= 0) return { ok: false };

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

  getSaldoCarteira() {
    return this.getData().carteira.saldo;
  },

  /* ===============================
     META
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
   UTIL
=============================== */
DataManager.formatarDataCurta = function (data) {
  const d = new Date(data);
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const ano = String(d.getFullYear()).slice(-2);
  return `${dia}/${mes}/${ano}`;
};
