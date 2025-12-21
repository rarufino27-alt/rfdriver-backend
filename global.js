// js/global.js
window.GlobalTheme = {
  init() {
    const tema = localStorage.getItem("tema") || "dark";
    document.body.dataset.theme = tema;
  },

  toggle() {
    const atual = document.body.dataset.theme === "light" ? "dark" : "light";
    document.body.dataset.theme = atual;
    localStorage.setItem("tema", atual);
  }
};

document.addEventListener("DOMContentLoaded", () => {

  if (typeof DataManager !== "undefined") {
    const data = DataManager.getData();
    const anoAtual = new Date().getFullYear();

    if (!data.configuracoes) data.configuracoes = {};
    data.configuracoes.anoAtual = anoAtual;

    DataManager.saveData(data);
  }

  GlobalTheme.init();

  console.log("🌐 Global.js carregado com sucesso");
});
