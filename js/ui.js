/*
 * Piezas de interfaz compartidas: escape, placa, estados, QR simulado, avisos.
 */
window.Pluma = window.Pluma || {};

(function () {
  const UI = {};
  Pluma.UI = UI;

  UI.esc = (s) => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

  // La placa guatemalteca: franja azul con «GUATEMALA» y caracteres negros sobre blanco.
  UI.placa = function (placa, tam) {
    const t = tam || "m";
    if (!placa) return `<span class="placa placa-${t} placa-vacia" aria-label="Sin placa"><span class="placa-pais">GUATEMALA</span><span class="placa-num">— — —</span></span>`;
    return `<span class="placa placa-${t}" aria-label="Placa ${UI.esc(placa)}"><span class="placa-pais" aria-hidden="true">GUATEMALA</span><span class="placa-num">${UI.esc(placa)}</span></span>`;
  };

  // Identifica una visita: placa si es vehicular, nombre con ícono si es peatonal.
  UI.quien = function (v, tam) {
    if (v.modalidad === "VEHICULAR") return UI.placa(v.placa, tam || "s");
    return `<span class="peaton">${UI.icono("peaton")}${UI.esc(Pluma.R.nombreVisita(v))}</span>`;
  };

  const ESTADOS = {
    DENTRO: ["paso", "Dentro"],
    FINALIZADA: ["neutro", "Finalizada"],
    EMITIDO: ["azul", "Emitido"],
    UTILIZADO: ["neutro", "Utilizado"],
    VENCIDO: ["neutro", "Vencido"],
    REVOCADO: ["freno", "Revocado"],
    ABIERTO: ["pluma", "Abierto"],
    "EN REVISIÓN": ["azul", "En revisión"],
    RESUELTO: ["paso", "Resuelto"],
    DESCARTADO: ["neutro", "Descartado"],
    PROLONGADA: ["pluma", "Prolongada"],
  };
  UI.estado = function (codigo) {
    const [tono, texto] = ESTADOS[codigo] || ["neutro", codigo];
    return `<span class="estado estado-${tono}">${texto}</span>`;
  };

  const ICONOS = {
    peaton: '<circle cx="12" cy="4.5" r="2"/><path d="M12 7.5v6m0 0-3 6m3-6 3 6M8 11l4-2 4 2"/>',
    auto: '<path d="M4 15v-3l2-5h12l2 5v3M4 15h16M4 15v3h3v-3m10 0v3h3v-3"/><circle cx="7.5" cy="12.5" r=".5"/><circle cx="16.5" cy="12.5" r=".5"/>',
    camara: '<path d="M4 8h3l2-2h6l2 2h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    qr: '<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM14 18h2v2h-2zM18 14h2v2h-2z"/>',
    entrada: '<path d="M10 4h9v16h-9M4 12h11m-4-4 4 4-4 4"/>',
    salida: '<path d="M14 4H5v16h9M9 12h11m-4-4 4 4-4 4"/>',
    telefono: '<path d="M6 3h4l1.5 5-2.5 1.5a11 11 0 0 0 5.5 5.5L16 12.5l5 1.5v4a2 2 0 0 1-2 2A17 17 0 0 1 4 5a2 2 0 0 1 2-2z"/>',
    aviso: '<path d="M12 3 2 20h20zM12 10v4m0 3v.5"/>',
    check: '<path d="m5 12 4.5 4.5L19 7"/>',
    reloj: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/>',
    lupa: '<circle cx="11" cy="11" r="6"/><path d="m20 20-4.5-4.5"/>',
    casa: '<path d="M4 11 12 4l8 7v9h-5v-6H9v6H4z"/>',
    escudo: '<path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6z"/>',
  };
  UI.icono = (n) => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONOS[n] || ""}</svg>`;

  // QR simulado: patrón determinista a partir del código, con los tres cuadros de
  // posición de un QR real. No es legible por un lector (decisión 2026-10-28).
  UI.qr = function (codigo, px) {
    const N = 25;
    let h = 2166136261;
    for (const c of codigo) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    const rnd = () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296;
    const enFinder = (x, y) => (x < 8 && y < 8) || (x > N - 9 && y < 8) || (x < 8 && y > N - 9);
    let celdas = "";
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++)
        if (!enFinder(x, y) && rnd() < 0.48) celdas += `M${x} ${y}h1v1h-1z`;
    const finder = (x, y) => `M${x} ${y}h7v7h-7zM${x + 1} ${y + 1}v5h5v-5zM${x + 2} ${y + 2}h3v3h-3z`;
    return `<svg class="qr" width="${px || 200}" height="${px || 200}" viewBox="-2 -2 ${N + 4} ${N + 4}" role="img" aria-label="Código QR simulado del pase ${UI.esc(codigo)}">
      <rect x="-2" y="-2" width="${N + 4}" height="${N + 4}" fill="#fff"/>
      <path fill="#14181b" fill-rule="evenodd" d="${finder(0, 0)}${finder(N - 7, 0)}${finder(0, N - 7)}${celdas}"/></svg>`;
  };

  UI.aviso = function (texto, tono) {
    const zona = document.getElementById("avisos");
    if (!zona) return;
    const el = document.createElement("div");
    el.className = `aviso-flotante aviso-${tono || "paso"}`;
    el.setAttribute("role", "status");
    el.innerHTML = `${UI.icono(tono === "freno" ? "aviso" : "check")}<span>${UI.esc(texto)}</span>`;
    zona.appendChild(el);
    setTimeout(() => el.classList.add("saliendo"), 3600);
    setTimeout(() => el.remove(), 4000);
  };

  // Ficha del destino que ve el guardia: apellidos, dirección y teléfono (decisión 2026-10-28).
  UI.fichaDestino = function (viv, conAccion) {
    if (!viv) return "";
    return `<div class="ficha">
      <div class="ficha-casa">${UI.icono("casa")}<div><strong>Familia ${UI.esc(viv.apellidos)}</strong><span>${UI.esc(viv.direccion)}</span></div></div>
      <div class="ficha-tel">${UI.icono("telefono")}<span class="num">${UI.esc(viv.telefonoContacto)}</span>
        ${conAccion ? `<button type="button" class="btn btn-quieto btn-s" data-accion="llamar" data-tel="${UI.esc(viv.telefonoContacto)}">Llamar</button>` : ""}</div>
    </div>`;
  };

  UI.vacio = (texto) => `<p class="vacio">${UI.esc(texto)}</p>`;
})();
