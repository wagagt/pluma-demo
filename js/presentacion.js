/*
 * Modo presentación: recorre el guion comercial (§18) paso a paso. Cada paso
 * abre la pantalla, deja preparados los datos que necesita y dice qué mostrar.
 * Los pasos sí son una secuencia: por eso van numerados.
 */
(function () {
  const { esc } = Pluma.UI;
  const S = Pluma.store, R = Pluma.R, T = Pluma.T;

  const usarGarita = (id) => { const g = R.garita(id); S.e.sesion.garitaId = g.id; S.e.sesion.coloniaId = g.coloniaId; };
  const placaDentro = (p) => S.e.visitas.find((v) => v.placa === p && v.estado === "DENTRO");

  // Garantiza que exista el pase de E3 (mañana, P-456DEF) aunque se salte el paso del vecino.
  function paseE3() {
    let p = S.e.pases.find((x) => x.placa === "P-456DEF" && x.viviendaId === "cip-18");
    if (!p) p = R.crearPase({ viviendaId: "cip-18", fecha: S.ahora() + T.D, modalidad: "VEHICULAR", nombre: "Lucía Salazar", identificacion: "4410", placa: "P-456DEF", vehiculo: "Mazda roja" });
    return p;
  }

  const PASOS = [
    { titulo: "El cuaderno de la garita", ruta: "#/",
      decir: "Hoy cada entrada se anota a mano: nadie sabe quién sigue dentro, cuánto lleva ni a qué casa vino. Pluma digitaliza la garita sin cambiar cómo trabaja el guardia." },
    { titulo: "Ingreso por placa en segundos", ruta: "#/garita/entrada", escenario: "E1 y E8",
      preparar() { usarGarita("cip-n"); },
      decir: "Toque P-123ABC en «Esperando en la garita». La cámara lee P-123A8C: el guardia la corrige, confirma que revisó la placa, busca «López» y registra. La bitácora se llena sola." },
    { titulo: "Salida y duración", ruta: "#/garita/salida", escenario: "E2",
      preparar() {
        usarGarita("cip-n");
        let v = placaDentro("P-123ABC");
        if (!v) {
          S.e.carril = S.e.carril.filter((l) => l.placa !== "P-123ABC");
          v = R.registrarIngreso({ garitaId: "cip-n", viviendaId: "cip-18", modalidad: "VEHICULAR", placa: "P-123ABC" }, true).visita;
        }
        // Solo lo que falte para dos horas: volver a este paso no adelanta el reloj otra vez.
        const falta = 2 * T.H - (S.ahora() - v.entrada);
        if (falta > 0) S.avanzar(falta);
      },
      decir: "Pasaron dos horas (el reloj de la demo se adelantó). Busque P-123ABC, confirme la salida: la duración se calcula y la ocupación baja en uno." },
    { titulo: "También a pie", ruta: "#/garita/entrada", escenario: "E9",
      preparar() { usarGarita("cip-n"); },
      decir: "Ana Pérez llega a pie a donde los Morales: nombre, últimos 4 dígitos del DPI y destino. Cuenta en la ocupación por separado." },
    { titulo: "La placa no coincide", ruta: "#/garita/entrada", escenario: "E10",
      preparar() { usarGarita("cip-n"); },
      decir: "Toque P-246TUW «trae pase»: el pase es para P-246TUV. El sistema avisa y el guardia decide llamando a la casa; nada se rechaza solo." },
    { titulo: "Pase QR preautorizado", ruta: "#/vecino/pase", escenario: "E3",
      decir: "El vecino de Casa 18 crea un pase para mañana: nombre, placa P-456DEF. El código no lleva datos personales; se comparte por WhatsApp." },
    { titulo: "El pase solo vale su día", ruta: "#/garita/pase", escenario: "E3",
      preparar() { usarGarita("cip-n"); paseE3(); },
      decir: "En la garita, simule el escaneo del pase de P-456DEF: hoy dice «Todavía no es válido». Use «+1 día» arriba y vuelva a escanearlo: ahora es válido. Verifique identidad y confirme." },
    { titulo: "Un pase no se usa dos veces", ruta: "#/garita/pase", escenario: "E4",
      preparar() {
        usarGarita("cip-n");
        const p = paseE3();
        if (p.estado === "EMITIDO") {
          if (T.compararDia(S.ahora(), p.fecha) < 0) S.avanzar(T.D);
          R.canjearPase(p.codigo, "cip-n", "P-456DEF");
        }
      },
      decir: "Escanee otra vez el pase de P-456DEF (o PL-3M7Q9T): «Este pase ya se usó», con fecha y hora. No se crea una segunda visita." },
    { titulo: "Visita de varios días", ruta: "#/supervisor", escenario: "E5",
      preparar() { S.e.sesion.filtro = "cip"; },
      decir: "En el panel, P-789GHI lleva más de 76 horas dentro (hoy ya pasa de 100). Es un aviso para revisar, no una sanción: ninguna visita se cierra sola." },
    { titulo: "El vecino reporta", ruta: "#/vecino/incidente", escenario: "E6",
      decir: "El vecino reporta exceso de velocidad de P-789GHI en el Sector B. Recibe un folio; su nombre no se comparte con el reportado." },
    { titulo: "Seguridad revisa", ruta: "#/supervisor/incidentes", escenario: "E6",
      preparar() {
        S.e.sesion.filtro = "cip";
        if (!S.e.incidentes.some((i) => i.placa === "P-789GHI"))
          R.crearIncidente({ reportadoPor: "cip-18", placa: "P-789GHI", rasgos: "", tipo: "Exceso de velocidad", lugar: "Sector B, frente al parque", fechaHora: S.ahora() - 40 * T.MIN, relato: "Pasó a mucha velocidad junto a niños en bicicleta.", evidencia: true });
      },
      decir: "Abra el reporte de P-789GHI: el sistema sugiere la visita que estaba dentro a esa hora, con la casa que la recibió. El supervisor verifica y decide si la asocia." },
    { titulo: "Privacidad entre vecinos", ruta: "#/vecino/placa", escenario: "E7",
      decir: "Si el vecino consulta P-789GHI, no ve a qué casa va. Se le ofrece reportar: seguridad responde por él." },
    { titulo: "Todas las garitas en una consola", ruta: "#/supervisor", escenario: "E11",
      preparar() { S.e.sesion.filtro = "todas"; },
      decir: "Vista consolidada: dos colonias, tres garitas. Comparativo de ingresos, uso de pases y quién está dentro, por garita." },
    { titulo: "Cierre", ruta: "#/",
      decir: "Trazabilidad de cada acceso, ingreso más rápido con pase, avisos que previenen y un supervisor que decide con datos. Sin prometer vigilancia perfecta ni abrir datos personales a todos." },
  ];

  let paso = -1;
  try { const g = Number(sessionStorage.getItem("pluma-paso")); if (!Number.isNaN(g) && sessionStorage.getItem("pluma-paso") !== null) paso = g; } catch (_) {}

  function recordar() { try { sessionStorage.setItem("pluma-paso", String(paso)); } catch (_) {} }

  function ir(n) {
    paso = Math.max(0, Math.min(PASOS.length - 1, n));
    recordar();
    const p = PASOS[paso];
    // Cada paso arranca con las pantallas limpias (sin un pase escaneado ni un formulario a medias).
    Pluma.reiniciarVistas.forEach((fn) => fn());
    if (p.preparar) p.preparar();
    S.guardar();
    Pluma.ir(p.ruta);
  }

  Pluma.presentacion = {
    activa: () => paso >= 0,
    pintar() {
      const zona = document.getElementById("presentacion");
      if (paso < 0) { zona.innerHTML = ""; zona.hidden = true; return; }
      const p = PASOS[paso];
      zona.hidden = false;
      zona.innerHTML = `
        <div class="pres-progreso" aria-hidden="true">${PASOS.map((_, i) => `<span class="${i < paso ? "hecho" : i === paso ? "actual" : ""}"></span>`).join("")}</div>
        <div class="pres-cuerpo">
          <p class="pres-num num">${paso + 1}<span>/${PASOS.length}</span></p>
          <div class="pres-texto"><h2>${esc(p.titulo)}${p.escenario ? ` <small>${esc(p.escenario)}</small>` : ""}</h2><p>${esc(p.decir)}</p></div>
          <div class="pres-botones">
            <button type="button" class="btn btn-quieto" data-accion="pres-anterior" ${paso === 0 ? "disabled" : ""}>Anterior</button>
            ${paso < PASOS.length - 1 ? `<button type="button" class="btn btn-principal" data-accion="pres-siguiente">Siguiente</button>`
              : `<button type="button" class="btn btn-principal" data-accion="presentacion">Terminar</button>`}
          </div>
        </div>`;
      if (Pluma.ajustarTablet) Pluma.ajustarTablet();
    },
  };

  Pluma.accion("presentacion", () => {
    if (paso >= 0) { paso = -1; recordar(); Pluma.render(); return; }
    S.restablecer();
    Pluma.reiniciarVistas.forEach((fn) => fn());
    ir(0);
  });
  Pluma.accion("pres-siguiente", () => ir(paso + 1));
  Pluma.accion("pres-anterior", () => ir(paso - 1));

  document.addEventListener("keydown", (ev) => {
    if (paso < 0 || ev.target.closest("input, textarea, select")) return;
    if (ev.key === "ArrowRight" || ev.key === "PageDown") { ev.preventDefault(); ir(paso + 1); }
    if (ev.key === "ArrowLeft" || ev.key === "PageUp") { ev.preventDefault(); ir(paso - 1); }
  });
})();
