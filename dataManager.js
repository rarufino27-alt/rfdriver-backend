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
      data.metas = {}; // YYYY-MM : valor
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
     TEMA
  =============================== */
  toggleTema() {
    const data = this.getData();
    data.configuracoes.tema =
      data.configuracoes.tema === "dark" ? "light" : "dark";
    localStorage.setItem("tema", data.configuracoes.tema);
    this.saveData(data);
    return data.configuracoes.tema;
  },

  /* ===============================
     REGISTRO DE DESPESAS
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

    const registro = {
      id: this.gerarId(),
      categoria,
      descricao: descricao.trim(),
      tipo,
      valorParcela: Number(valorParcela),
      totalParcelas,
      recorrente: totalParcelas === null,
      dataBase,
      ativo: true,
      criadoEm: new Date().toISOString()
    };

    data.registros.push(registro);
    this.gerarPagamentos(registro, data);
    this.saveData(data);
  },

  gerarPagamentos(registro, data) {
    const base = new Date(registro.dataBase);

    if (registro.recorrente) {
      for (let i = 0; i < 24; i++) {
        const dt = new Date(base);
        dt.setMonth(dt.getMonth() + i);
        data.pagamentos.push(this._criarPagamento(registro, dt, "MENSAL"));
      }
    } else {
      for (let i = 1; i <= registro.totalParcelas; i++) {
        const dt = new Date(base);
        dt.setMonth(dt.getMonth() + (i - 1));
        data.pagamentos.push(
          this._criarPagamento(
            registro,
            dt,
            `${i} de ${registro.totalParcelas}`
          )
        );
      }
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
     META MENSAL (GLOBAL)
  =============================== */
  setMetaMensal(valor, mesAno) {
    const data = this.getData();
    data.metas[mesAno] = Number(valor);
    this.saveData(data);
  },

  getMetaMensal(mesAno) {
    return this.getData().metas[mesAno] || 0;
  },

  /* ===============================
     CARTEIRA
  =============================== */
  getSaldoCarteira() {
    return this.getData().carteira.saldo;
  },

  getHistoricoCarteira() {
    return this.getData().carteira.historico;
  }
};

const PlanoManager = {

  getPlano(){
    return localStorage.getItem("planoUsuario") || "freemium";
  },

  setPlano(plano){
    localStorage.setItem("planoUsuario", plano);

    if(plano === "freemium"){
      if(!localStorage.getItem("inicioTeste")){
        localStorage.setItem("inicioTeste", new Date().toISOString());
      }
    } else {
      localStorage.removeItem("inicioTeste");
    }
  },

  isTesteAtivo(){
    const inicio = localStorage.getItem("inicioTeste");
    if(!inicio) return false;

    const agora = new Date();
    const inicioData = new Date(inicio);
    const diffHoras = (agora - inicioData) / (1000 * 60 * 60);

    return diffHoras <= 36;
  },

  acessoTotalLiberado(){
    const plano = this.getPlano();
    if(plano !== "freemium") return true;
    return this.isTesteAtivo();
  }

};

const PaginasLiberadasFreemium = [
  "entradas.html"
];

const PlanoConfig = {
  freemium: {
    acessoTotal: false,
    paginasLiberadas: ["entradas.html"]
  },
  mensal: {
    acessoTotal: true
  },
  semestral: {
    acessoTotal: true
  },
  vitalicio: {
    acessoTotal: true
  }
};

PlanoManager.temAcessoTotal = function(){
  const plano = this.getPlano();
  return PlanoConfig[plano]?.acessoTotal === true;
};
