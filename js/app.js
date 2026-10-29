/*
 * Shell de la demo: router por hash, franja de controles de demo, delegación de
 * eventos y el lienzo fijo de tablet para las pantallas del guardia.
 */
window.Pluma = window.Pluma || {};

(function () {
  const { esc, icono } = Pluma.UI;
  const S = Pluma.store;
  const T = Pluma.T;

  const vistas = [];          // { patron, rol, render(params) }
  const acciones = {};        // data-accion → fn(el, ev)
  const entradas = {};        // data-entrada → fn(el, ev)
  const formularios = {};     // data-form → fn(form, datos, ev)

  Pluma.vista = (patron, rol, render) => vistas.push({ patron, rol, render });
  Pluma.accion = (nombre, fn) => { acciones[nombre] = fn; };
  Pluma.entrada = (nombre, fn) => { entradas[nombre] = fn; };
  Pluma.formulario = (nombre, fn) => { formularios[nombre] = fn; };
  Pluma.ir = (ruta) => { if (location.hash === ruta) Pluma.render(); else location.hash = ruta; };

  const ROLES = [
    { id: "guardia", nombre: "Guardia", inicio: "#/garita/entrada", detalle: "Registra entradas y salidas, escanea pases. Tablet en la garita." },
    { id: "vecino", nombre: "Vecino", inicio: "#/vecino", detalle: "Crea pases para sus visitas y reporta incidentes. Familia López, Casa 18." },
    { id: "visitante", nombre: "Visitante", inicio: "#/visitante", detalle: "Abre el pase que le compartió el vecino." },
    { id: "supervisor", nombre: "Supervisor", inicio: "#/supervisor", detalle: "Ve lo que pasa en todas las garitas y revisa incidentes." },
    { id: "admin", nombre: "Administrador", inicio: "#/admin", detalle: "Mantiene viviendas, garitas y la política de permanencia." },
  ];
  Pluma.ROLES = ROLES;

  /* ---------- Render ---------- */

  function rutaActual() {
    const h = location.hash || "#/";
    for (const v of vistas) {
      const m = h.match(v.patron);
      if (m) return { vista: v, params: m.slice(1).map(decodeURIComponent) };
    }
    return { vista: vistas[0], params: [] };
  }

  Pluma.render = function () {
    const { vista, params } = rutaActual();
    if (vista.rol && S.e.sesion.rol !== vista.rol) {
      S.e.sesion.rol = vista.rol;
      S.guardar();
    }
    document.getElementById("controles").innerHTML = controlesDemo();
    const app = document.getElementById("app");
    const esGarita = vista.rol === "guardia";
    document.body.classList.toggle("modo-garita", esGarita);
    if (esGarita) {
      app.innerHTML = `<div class="escenario"><div class="tablet-caja"><div class="tablet" id="tablet">${vista.render(...params)}</div></div>
        <p class="escenario-nota">Vista de la tablet de garita, reducida. Gire el teléfono para verla más grande.</p></div>`;
      ajustarTablet();
    } else {
      app.innerHTML = vista.render(...params);
    }
    if (Pluma.presentacion) Pluma.presentacion.pintar();
    const foco = app.querySelector("[data-autofoco]");
    if (foco) foco.focus({ preventScroll: true });
  };

  /* ---------- Franja de controles de demo (no es parte del producto) ---------- */

  function controlesDemo() {
    const e = S.e;
    const rol = e.sesion.rol;
    const opcionesRol = ROLES.map((r) => `<option value="${r.id}" ${r.id === rol ? "selected" : ""}>${r.nombre}</option>`).join("");
    const garitas = e.garitas.map((g) => `<option value="${g.id}" ${g.id === e.sesion.garitaId ? "selected" : ""}>${esc(g.nombre)}, ${esc(Pluma.R.colonia(g.coloniaId).nombre)}</option>`).join("");
    const sim = S.simulado();
    return `
      <a class="demo-marca" href="#/" title="Volver al inicio">Pluma <span>demo</span></a>
      <label class="demo-campo"><span>Ver como</span>
        <select data-entrada="cambiar-rol"><option value="" ${!rol ? "selected" : ""}>Inicio</option>${opcionesRol}</select></label>
      ${rol === "guardia" ? `<label class="demo-campo"><span>Garita</span><select data-entrada="cambiar-garita">${garitas}</select></label>` : ""}
      <div class="demo-reloj ${sim ? "simulado" : ""}" title="${sim ? "Reloj adelantado para la demo" : "Hora real"}">
        ${icono("reloj")}<span data-reloj-fecha>${esc(T.fecha(S.ahora()))}</span><strong data-reloj>${T.hora(S.ahora())}</strong>
        ${sim ? `<em>simulado</em>` : ""}
      </div>
      <label class="demo-campo"><span>Tema</span>
        <select data-entrada="cambiar-tema">${TEMAS.map(([id, n]) => `<option value="${id}" ${id === document.documentElement.dataset.tema ? "selected" : ""}>${n}</option>`).join("")}</select></label>
      <div class="demo-botones">
        <button type="button" data-accion="reloj" data-ms="${T.H}">+1 h</button>
        <button type="button" data-accion="reloj" data-ms="${2 * T.H}">+2 h</button>
        <button type="button" data-accion="reloj" data-ms="${T.D}">+1 día</button>
        ${sim ? `<button type="button" data-accion="hora-real">Hora real</button>` : ""}
        <button type="button" data-accion="restablecer">Restablecer demo</button>
        <button type="button" class="demo-presentar" data-accion="presentacion">${Pluma.presentacion && Pluma.presentacion.activa() ? "Salir de presentación" : "Presentar"}</button>
      </div>`;
  }

  const TEMAS = [["concreto", "Concreto"], ["neblina", "Neblina"], ["cal", "Cal"], ["noche", "Noche"]];
  Pluma.entrada("cambiar-tema", (el) => {
    const raiz = document.documentElement;
    raiz.dataset.tema = el.value;
    raiz.dataset.theme = el.value === "noche" ? "dark" : "light";
    try { localStorage.setItem("pluma-tema", el.value); } catch (_) {}
  });
  Pluma.entrada("cambiar-rol", (el) => {
    const r = ROLES.find((x) => x.id === el.value);
    S.e.sesion.rol = r ? r.id : null;
    S.guardar();
    Pluma.ir(r ? r.inicio : "#/");
  });
  Pluma.entrada("cambiar-garita", (el) => {
    const g = Pluma.R.garita(el.value);
    S.e.sesion.garitaId = g.id;
    S.e.sesion.coloniaId = g.coloniaId;
    S.guardar();
    Pluma.render();
  });
  Pluma.accion("reloj", (el) => { S.avanzar(Number(el.dataset.ms)); Pluma.render(); Pluma.UI.aviso(`Reloj adelantado: ${T.fecha(S.ahora())}, ${T.hora(S.ahora())}`, "azul"); });
  Pluma.accion("hora-real", () => { S.horaReal(); Pluma.render(); });
  Pluma.accion("restablecer", () => {
    S.restablecer();
    if (Pluma.reiniciarVistas) Pluma.reiniciarVistas.forEach((fn) => fn());
    Pluma.render();
    Pluma.UI.aviso("Demo restablecida con los datos iniciales", "azul");
  });
  Pluma.accion("llamar", (el) => Pluma.UI.aviso(`Llamada simulada a ${el.dataset.tel}`, "azul"));
  Pluma.reiniciarVistas = [];

  /* ---------- P01 Inicio ---------- */

  Pluma.vista(/^#?\/?$/, null, function () {
    S.e.sesion.rol = null;
    const oc = Pluma.R.ocupacion("todas");
    return `<main class="inicio">
      <section class="inicio-portada">
        <div class="inicio-texto">
          <p class="inicio-producto">Pluma</p>
          <h1>Cada entrada a la colonia, registrada en segundos y consultable cuando importa.</h1>
          <p class="inicio-sub">El cuaderno de la garita no dice quién sigue dentro, cuánto tiempo lleva ni a qué casa vino.
            Esta demo muestra cómo se ve cuando sí lo dice. Todos los datos son inventados.</p>
        </div>
        <div class="inicio-placa" aria-hidden="true">${Pluma.UI.placa("P-123ABC", "xl")}
          <p class="inicio-ahora"><strong>${oc.total}</strong> visitas dentro ahora en ${S.e.colonias.length} colonias y ${S.e.garitas.length} garitas</p>
        </div>
      </section>
      <section class="inicio-roles" aria-labelledby="t-roles">
        <h2 id="t-roles">Elija desde dónde ver la demo</h2>
        <ul class="roles">
          ${ROLES.map((r) => `<li><a class="rol" href="${r.inicio}" data-accion="elegir-rol" data-rol="${r.id}">
            <strong>${r.nombre}</strong><span>${esc(r.detalle)}</span></a></li>`).join("")}
        </ul>
        <p class="inicio-presentar"><button type="button" class="btn btn-principal" data-accion="presentacion">Iniciar presentación guiada</button>
          <span>Recorre el guion paso a paso con los datos preparados.</span></p>
      </section>
    </main>`;
  });
  Pluma.accion("elegir-rol", (el, ev) => {
    ev.preventDefault();
    const r = ROLES.find((x) => x.id === el.dataset.rol);
    S.e.sesion.rol = r.id;
    S.guardar();
    Pluma.ir(r.inicio);
  });

  /* ---------- Lienzo de tablet: 1180 × 820 fijo, escalado si no cabe ---------- */

  const ANCHO = 1180, ALTO = 820;
  function ajustarTablet() {
    const caja = document.querySelector(".tablet-caja");
    const tablet = document.getElementById("tablet");
    if (!caja || !tablet) return;
    const controles = document.getElementById("controles").offsetHeight;
    const pres = document.getElementById("presentacion").offsetHeight;
    const tactil = matchMedia("(pointer: coarse)").matches && innerWidth >= 1024;
    document.body.classList.toggle("tablet-real", tactil);
    const margen = tactil ? 0 : 48;
    const esc = Math.min(1, (innerWidth - margen) / ANCHO, (innerHeight - controles - pres - margen) / ALTO);
    const e = Math.max(esc, 0.25);
    tablet.style.transform = `scale(${e})`;
    caja.style.width = `${ANCHO * e}px`;
    caja.style.height = `${ALTO * e}px`;
  }
  Pluma.ajustarTablet = ajustarTablet;
  addEventListener("resize", ajustarTablet);

  /* ---------- Delegación de eventos ---------- */

  document.addEventListener("click", (ev) => {
    const el = ev.target.closest("[data-accion]");
    if (el && acciones[el.dataset.accion]) acciones[el.dataset.accion](el, ev);
  });
  document.addEventListener("input", (ev) => {
    const el = ev.target.closest("[data-entrada]");
    if (el && entradas[el.dataset.entrada] && el.tagName !== "SELECT") entradas[el.dataset.entrada](el, ev);
  });
  document.addEventListener("change", (ev) => {
    const el = ev.target.closest("[data-entrada]");
    if (el && entradas[el.dataset.entrada] && (el.tagName === "SELECT" || el.type === "checkbox" || el.type === "radio" || el.type === "date"))
      entradas[el.dataset.entrada](el, ev);
  });
  document.addEventListener("submit", (ev) => {
    const f = ev.target.closest("[data-form]");
    if (!f || !formularios[f.dataset.form]) return;
    ev.preventDefault();
    formularios[f.dataset.form](f, Object.fromEntries(new FormData(f).entries()), ev);
  });

  // Reloj y duraciones en vivo, sin repintar la pantalla (no se pierde lo escrito).
  setInterval(() => {
    const ahora = S.ahora();
    document.querySelectorAll("[data-reloj]").forEach((el) => { el.textContent = T.hora(ahora); });
    document.querySelectorAll("[data-desde]").forEach((el) => { el.textContent = T.duracion(ahora - Number(el.dataset.desde)); });
  }, 10e3);

  addEventListener("hashchange", Pluma.render);
  addEventListener("DOMContentLoaded", () => {
    S.iniciar();
    Pluma.render();
  });
})();
