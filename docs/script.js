(() => {
  const storageKey = "ac-display-unit-docs-language";
  const body = document.body;
  const button = document.querySelector("[data-language-toggle]");
  const modalBackdrop = document.querySelector("[data-modal-backdrop]");
  const modalTitle = document.querySelector("[data-modal-title]");
  const modalDescription = document.querySelector("[data-modal-description]");
  const modalDownload = document.querySelector("[data-modal-download]");
  const downloadData = {
    installer: {
      title: "AC Display Unit v1.0.1 — Windows Installer",
      description: "Install the desktop launcher, backend, collector, and CSP bridge tools on Windows x64.",
      url: "https://github.com/yeftakun/ac-hud/releases/download/v1.0.1/AC-Display-Unit-v1.0.1-Setup.exe"
    },
    portable: {
      title: "AC Display Unit v1.0.1 — Portable ZIP",
      description: "Extract and run the portable Windows x64 bundle without using an installer.",
      url: "https://github.com/yeftakun/ac-hud/releases/download/v1.0.1/AC-Display-Unit-v1.0.1-win-x64.zip"
    }
  };
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
  document.querySelectorAll("[data-download-modal]").forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const data = downloadData[trigger.dataset.downloadModal];
      if (!data || !modalBackdrop || !modalTitle || !modalDescription || !modalDownload) return;
      modalTitle.textContent = data.title;
      modalDescription.textContent = data.description;
      modalDownload.href = data.url;
      modalDownload.textContent = body.dataset.language === "id" ? "Unduh" : "Download";
      modalBackdrop.hidden = false;
      document.body.classList.add("modal-open");
    });
  });
  function closeModal() {
    if (modalBackdrop) modalBackdrop.hidden = true;
    document.body.classList.remove("modal-open");
  }
  document.querySelector("[data-modal-close]")?.addEventListener("click", closeModal);
  modalBackdrop?.addEventListener("click", (event) => { if (event.target === modalBackdrop) closeModal(); });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeModal(); });
})();
