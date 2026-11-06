const host = window.location.hostname || "localhost";

// Keep the API on the same host as the page. This works both from localhost
// and from another device on the LAN, without depending on which Vite port
// happened to be selected or whether an old Vite process has the proxy.
export const CONFIG_API_URL = `${window.location.protocol}//${host}:3001`;
