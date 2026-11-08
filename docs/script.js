(() => {
  const storageKey = "ac-display-unit-docs-language";
  const body = document.body;
  const button = document.querySelector("[data-language-toggle]");
  const savedLanguage = window.localStorage.getItem(storageKey);
  function setLanguage(language) {
    const nextLanguage = language === "id" ? "id" : "en";
    body.dataset.language = nextLanguage;
    document.documentElement.lang = nextLanguage;
    if (button) {
      button.textContent = nextLanguage === "en" ? "ID" : "EN";
      button.setAttribute("aria-label", nextLanguage === "en" ? "Switch to Indonesian" : "Switch to English");
    }
    window.localStorage.setItem(storageKey, nextLanguage);
  }
  setLanguage(savedLanguage || "en");
  button?.addEventListener("click", () => setLanguage(body.dataset.language === "en" ? "id" : "en"));
})();
