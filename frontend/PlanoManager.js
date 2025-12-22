/* ===============================
   PLANO MANAGER - RF DRIVER
   Controle central de planos
================================ */

(function(){

  const STORAGE_KEY = "rf_plano";
  const TESTE_HORAS = 36;

  function agora(){
    return new Date().getTime();
  }

  function getPlanoData(){
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
      plano: "freemium",
      testeInicio: null,
      ativo: true
    };
  }

  function salvarPlano(data){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  window.PlanoManager = {

    /* ===== INFO ===== */
    getPlano(){
      return getPlanoData().plano;
    },

    isTesteAtivo(){
      const d = getPlanoData();
      if(!d.testeInicio) return false;
      const limite = d.testeInicio + TESTE_HORAS * 60 * 60 * 1000;
      return agora() < limite;
    },

    /* ===== AÇÕES ===== */
    setPlano(plano){
      salvarPlano({
        plano,
        testeInicio: null,
        ativo: true
      });
    },

    ativarTeste36h(){
      salvarPlano({
        plano: "freemium",
        testeInicio: agora(),
        ativo: true
      });
    },

    resetarFreemium(){
      salvarPlano({
        plano: "freemium",
        testeInicio: null,
        ativo: true
      });
    },

    /* ===== PERMISSÕES ===== */
    podeAcessar(modulo){
      const d = getPlanoData();

      // Teste ativo libera tudo
      if(this.isTesteAtivo()) return true;

      // Planos pagos liberam tudo
      if(d.plano !== "freemium") return true;

      // Freemium SEM teste
      const liberados = [
        "dashboard",
        "entradas",
        "perfil",
        "planos"
      ];

      return liberados.includes(modulo);
    },

    /* ===== GUARDA GLOBAL ===== */
    protegerPagina(modulo){
      if(!this.podeAcessar(modulo)){
        window.location.replace("planos.html");
      }
    }

  };

})();
