const PlanoManager = {

  planos: {
    freemium: {
      paginasLiberadas: [
        "index.html",
        "perfil.html",
        "entradas.html",
        "planos.html"
      ]
    },
    mensal: { dias: 30 },
    semestral: { dias: 180 },
    vitalicio: { dias: null },
    teste: { horas: 36 }
  },

  getDados(){
    return JSON.parse(localStorage.getItem("planoUsuario")) || null;
  },

  salvar(dados){
    localStorage.setItem("planoUsuario", JSON.stringify(dados));
  },

  setPlano(tipo){
    const agora = Date.now();
    let expiraEm = null;

    if(this.planos[tipo]?.dias){
      expiraEm = agora + (this.planos[tipo].dias * 24 * 60 * 60 * 1000);
    }

    this.salvar({
      tipo,
      inicio: agora,
      expiraEm
    });
  },

  ativarTeste36h(){
    const agora = Date.now();
    const expiraEm = agora + (36 * 60 * 60 * 1000);

    this.salvar({
      tipo: "teste",
      inicio: agora,
      expiraEm
    });
  },

  planoAtivo(){
    const dados = this.getDados();
    if(!dados) return "freemium";

    if(dados.expiraEm && Date.now() > dados.expiraEm){
      this.resetarFreemium();
      return "freemium";
    }

    return dados.tipo;
  },

  resetarFreemium(){
    this.salvar({
      tipo: "freemium",
      inicio: Date.now(),
      expiraEm: null
    });
  },

  acessoTotal(){
    const plano = this.planoAtivo();
    return plano !== "freemium";
  }

};
