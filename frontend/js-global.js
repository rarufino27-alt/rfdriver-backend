(function(){

  // Tema
  const temaSalvo = localStorage.getItem("tema") || "dark";
  document.body.dataset.theme = temaSalvo;

  window.toggleTheme = function(){
    const novo = document.body.dataset.theme === "light" ? "dark" : "light";
    document.body.dataset.theme = novo;
    localStorage.setItem("tema", novo);
  }

  // Drawer
  window.toggleDrawer = function(){
    document.getElementById("drawer")?.classList.toggle("open");
  }

  // Loader simples de componentes
  window.loadComponent = async function(id, file){
    const el = document.getElementById(id);
    if(!el) return;
    const html = await fetch(file).then(r=>r.text());
    el.innerHTML = html;
  }

})();
