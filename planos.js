// ------------------------------
//  leitor do plano atual
// ------------------------------
function getPlano(){
  return (localStorage.getItem("planoAtivo") || "FREEMIUM").toUpperCase();
}

// ------------------------------
//  gravar plano escolhido
// ------------------------------
function setPlano(plano){
  localStorage.setItem("planoAtivo", plano.toUpperCase());
}

// ------------------------------
//  TRIAL 36 HORAS
// ------------------------------

function iniciarTrial36h(){

  const jaUtilizou = localStorage.getItem("trialUsado");

  if(jaUtilizou){
    alert("Você já utilizou o teste gratuito de 36h.");
    return;
  }

  const expira = Date.now() + (36 * 60 * 60 * 1000); // 36h em ms

  localStorage.setItem("planoAtivo", "TRIAL");
  localStorage.setItem("trialExpira", expira);
  localStorage.setItem("trialUsado", "1");

  alert("Teste ativado! Você tem acesso total por 36 horas!");
  location.href="index.html";
}

// ------------------------------
//  Validação automática
// ------------------------------

function validarTrial(){
  const plano = getPlano();
  if(plano === "TRIAL"){
    const expira = Number(localStorage.getItem("trialExpira") || 0);
    if(Date.now() > expira){
      alert("Seu teste terminou. Assine um plano para continuar.");
      localStorage.setItem("planoAtivo", "FREEMIUM");
      localStorage.removeItem("trialExpira");
      location.href="planos.html";
    }
  }
}

// chamar sempre
validarTrial();
