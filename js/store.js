/*
 * Estado único de la demo, reloj simulado y reglas de negocio.
 * Las reglas no tocan el DOM: reciben datos y devuelven resultados.
 */
window.Pluma = window.Pluma || {};

(function () {
  const CLAVE = "pluma-demo-v1";
  const MIN = 60e3, H = 60 * MIN, D = 24 * H;
  const TZ = "America/Guatemala";

  let estado = null;
  const oyentes = [];

  function cargar() {
    try {
      const crudo = localStorage.getItem(CLAVE);
      if (crudo) {
        const e = JSON.parse(crudo);
        if (e && e.version === 1) return e;
      }
    } catch (_) { /* sin almacenamiento: la demo sigue en memoria */ }
    return Pluma.crearSeed(Date.now());
  }

  function guardar() {
    try { localStorage.setItem(CLAVE, JSON.stringify(estado)); } catch (_) {}
    oyentes.forEach((fn) => fn());
  }

  const store = {
    get e() { return estado; },
    iniciar() { estado = cargar(); },
    guardar,
    alCambiar(fn) { oyentes.push(fn); },
    restablecer() {
      const sesion = estado ? estado.sesion : null;
      estado = Pluma.crearSeed(Date.now());
      if (sesion) estado.sesion = { ...estado.sesion, rol: sesion.rol };
      guardar();
    },
    ahora() { return Date.now() + (estado ? estado.offset : 0); },
    avanzar(ms) { estado.offset += ms; guardar(); },
    horaReal() { estado.offset = 0; guardar(); },
    simulado() { return estado.offset !== 0; },
    auditar(actor, accion, objeto, motivo) {
      estado.auditoria.unshift({ actor, accion, objeto, motivo: motivo || "", fechaHora: store.ahora() });
    },
  };
  Pluma.store = store;

  /* ---------- Fechas en hora de Guatemala ---------- */
  const fmtDia = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
  const fmtHora = new Intl.DateTimeFormat("es-GT", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false });
  const fmtFecha = new Intl.DateTimeFormat("es-GT", { timeZone: TZ, weekday: "short", day: "numeric", month: "short" });
  const fmtFechaLarga = new Intl.DateTimeFormat("es-GT", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" });
  const fmtHoraNum = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", hour12: false });

  const T = {
    MIN, H, D,
    dia: (t) => fmtDia.format(t),
    hora: (t) => fmtHora.format(t),
    fecha: (t) => fmtFecha.format(t).replace(".", ""),
    fechaLarga: (t) => fmtFechaLarga.format(t),
    horaDelDia: (t) => Number(fmtHoraNum.format(t)) % 24,
    mismoDia: (a, b) => fmtDia.format(a) === fmtDia.format(b),
    // Compara días calendario de Guatemala: <0 antes, 0 mismo día, >0 después.
    compararDia: (a, b) => (fmtDia.format(a) < fmtDia.format(b) ? -1 : fmtDia.format(a) > fmtDia.format(b) ? 1 : 0),
    duracion(ms) {
      const m = Math.max(0, Math.round(ms / MIN));
      // En horas hasta 167 h: «76 h» se entiende mejor en garita que «3 d 4 h».
      const h = Math.floor(m / 60), mm = m % 60;
      if (h >= 168) return `${Math.floor(h / 24)} d ${h % 24} h`;
      if (h) return `${h} h ${String(mm).padStart(2, "0")} min`;
      return `${mm} min`;
    },
    // Convierte «AAAA-MM-DD» (fecha elegida en un formulario) al mediodía de Guatemala.
    desdeInput: (s) => Date.parse(`${s}T12:00:00-06:00`),
    aInput: (t) => fmtDia.format(t),
  };
  Pluma.T = T;

  /* ---------- Consultas ---------- */
  const R = {};
  Pluma.R = R;

  R.colonia = (id) => estado.colonias.find((c) => c.id === id);
  R.garita = (id) => estado.garitas.find((g) => g.id === id);
  R.vivienda = (id) => estado.viviendas.find((v) => v.id === id);
  R.visitante = (id) => estado.visitantes.find((v) => v.id === id);
  R.visita = (id) => estado.visitas.find((v) => v.id === id);
  R.pase = (codigo) => estado.pases.find((p) => p.codigo === codigo.trim().toUpperCase());
  R.incidente = (id) => estado.incidentes.find((i) => i.id === id);
  R.vehiculo = (placa) => (placa && estado.vehiculos[placa]) || null;

  R.normalizarPlaca = function (p) {
    const limpio = String(p || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!limpio) return "";
    const m = limpio.match(/^([A-Z]{1,2})(\d{3}[A-Z0-9]{3})$/);
    return m ? `${m[1]}-${m[2]}` : limpio;
  };
  R.placaValida = (p) => /^[A-Z]{1,2}-\d{3}[A-Z0-9]{3}$/.test(p);

  // `filtro`: id de colonia, id de garita (`cip-n`) o "todas".
  R.enFiltro = function (visita, filtro) {
    if (!filtro || filtro === "todas") return true;
    if (estado.colonias.some((c) => c.id === filtro)) return visita.coloniaId === filtro;
    return visita.garitaEntradaId === filtro || visita.garitaSalidaId === filtro;
  };
  R.coloniaDeFiltro = function (filtro) {
    if (!filtro || filtro === "todas") return null;
    if (estado.colonias.some((c) => c.id === filtro)) return filtro;
    const g = R.garita(filtro);
    return g ? g.coloniaId : null;
  };

  R.dentro = (filtro) => estado.visitas.filter((v) => v.estado === "DENTRO" && R.enFiltro(v, filtro));
  R.duracion = (v) => (v.salida || store.ahora()) - v.entrada;
  R.prolongada = (v) => v.estado === "DENTRO" && R.duracion(v) > estado.umbralHoras * H;

  R.ocupacion = function (filtro) {
    const d = R.dentro(filtro);
    return {
      total: d.length,
      vehiculos: d.filter((v) => v.modalidad === "VEHICULAR").length,
      peatones: d.filter((v) => v.modalidad === "PEATONAL").length,
    };
  };

  R.nombreVisita = function (v) {
    if (v.modalidad === "VEHICULAR") return v.placa;
    const vis = R.visitante(v.visitanteId);
    return vis ? vis.nombre : "Peatón";
  };

  R.enmascarar = (ident) => (ident ? `••••• ${String(ident).replace(/\D/g, "").slice(-4)}` : "sin dato");

  R.incidentesDePlaca = (placa) =>
    estado.incidentes.filter((i) => i.placa === placa && i.estado !== "DESCARTADO" && i.estado !== "RESUELTO");

  R.buscarViviendas = function (coloniaId, texto) {
    const q = texto.trim().toLowerCase();
    if (q.length < 2) return [];
    const sinTildes = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    const qq = sinTildes(q);
    return estado.viviendas
      .filter((v) => v.coloniaId === coloniaId && v.activa)
      .filter((v) => sinTildes(`${v.apellidos} ${v.direccion} ${v.numero}`).includes(qq))
      .slice(0, 6);
  };

  // Eventos del día para la bitácora de una garita, el más reciente primero.
  R.bitacora = function (garitaId) {
    const ahora = store.ahora();
    const ev = [];
    estado.visitas.forEach((v) => {
      if (v.garitaEntradaId === garitaId && T.mismoDia(v.entrada, ahora) && v.entrada <= ahora)
        ev.push({ tipo: "entrada", t: v.entrada, visita: v });
      if (v.salida && v.garitaSalidaId === garitaId && T.mismoDia(v.salida, ahora) && v.salida <= ahora)
        ev.push({ tipo: "salida", t: v.salida, visita: v });
    });
    return ev.sort((a, b) => b.t - a.t);
  };

  /* ---------- Acciones ---------- */

  function nuevoId(tipo, prefijo) {
    const n = estado.seq[tipo]++;
    return `${prefijo}${String(n).padStart(4, "0")}`;
  }

  // Devuelve { ok, visita } o { duplicada } si la placa ya tiene una visita abierta.
  R.registrarIngreso = function (datos, forzar) {
    if (datos.modalidad === "VEHICULAR" && !forzar) {
      const abierta = estado.visitas.find((v) => v.estado === "DENTRO" && v.placa === datos.placa);
      if (abierta) return { duplicada: abierta };
    }
    const g = R.garita(datos.garitaId);
    let visitanteId = datos.visitanteId || null;
    if (!visitanteId && datos.nombreVisitante) {
      visitanteId = `vis-n${estado.seq.visita}`;
      estado.visitantes.push({ id: visitanteId, nombre: datos.nombreVisitante, identificacion: datos.identificacion || "" });
    }
    const visita = {
      id: nuevoId("visita", "V"),
      coloniaId: g.coloniaId, viviendaId: datos.viviendaId,
      modalidad: datos.modalidad, placa: datos.placa || null, visitanteId,
      estado: "DENTRO", entrada: store.ahora(), salida: null,
      garitaEntradaId: g.id, garitaSalidaId: null, guardia: g.guardia,
      origen: datos.paseId ? "PASE" : "MANUAL", paseId: datos.paseId || null,
      observaciones: datos.observaciones || "",
    };
    estado.visitas.push(visita);
    if (datos.placa && !estado.vehiculos[datos.placa]) estado.vehiculos[datos.placa] = { marca: "", modelo: "", color: "" };
    if (datos.llegadaId) estado.carril = estado.carril.filter((l) => l.id !== datos.llegadaId);
    store.auditar(g.guardia, "registró ingreso", visita.id);
    guardar();
    return { ok: true, visita };
  };

  R.registrarSalida = function (visitaId, garitaId) {
    const v = R.visita(visitaId);
    if (!v || v.estado !== "DENTRO") return null;
    const g = R.garita(garitaId);
    v.estado = "FINALIZADA";
    v.salida = store.ahora();
    v.garitaSalidaId = garitaId;
    store.auditar(g.guardia, "confirmó salida", v.id);
    guardar();
    return v;
  };

  // Validación de un pase en garita, en el orden del diseño funcional §4.
  R.validarPase = function (codigo) {
    const p = R.pase(codigo || "");
    if (!p) return { resultado: "NO_EXISTE" };
    if (p.estado === "REVOCADO") return { resultado: "REVOCADO", pase: p };
    if (p.estado === "UTILIZADO") return { resultado: "UTILIZADO", pase: p };
    const c = T.compararDia(store.ahora(), p.fecha);
    if (c < 0) return { resultado: "FUTURO", pase: p };
    if (c > 0) return { resultado: "VENCIDO", pase: p };
    return { resultado: "VALIDO", pase: p };
  };

  R.estadoPase = function (p) {
    if (p.estado !== "EMITIDO") return p.estado;
    const c = T.compararDia(store.ahora(), p.fecha);
    return c > 0 ? "VENCIDO" : "EMITIDO";
  };

  R.canjearPase = function (codigo, garitaId, placaObservada, llegadaId) {
    const { resultado, pase } = R.validarPase(codigo);
    if (resultado !== "VALIDO") return { resultado };
    const r = R.registrarIngreso({
      garitaId, viviendaId: pase.viviendaId, modalidad: pase.modalidad,
      placa: pase.modalidad === "VEHICULAR" ? placaObservada || pase.placa : null,
      visitanteId: pase.visitanteId, paseId: pase.id, llegadaId,
      observaciones: placaObservada && placaObservada !== pase.placa ? `Llegó en ${placaObservada}; pase emitido para ${pase.placa}.` : "",
    }, true);
    pase.estado = "UTILIZADO";
    pase.usadoEn = store.ahora();
    pase.visitaId = r.visita.id;
    guardar();
    return { resultado: "CANJEADO", visita: r.visita };
  };

  R.crearPase = function (datos) {
    const letras = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    let codigo;
    do {
      codigo = "PL-" + Array.from({ length: 6 }, () => letras[Math.floor(Math.random() * letras.length)]).join("");
    } while (R.pase(codigo));
    const visitanteId = `vis-q${estado.seq.pase}`;
    estado.visitantes.push({ id: visitanteId, nombre: datos.nombre, identificacion: datos.identificacion || "" });
    if (datos.placa && !estado.vehiculos[datos.placa])
      estado.vehiculos[datos.placa] = { marca: datos.vehiculo || "", modelo: "", color: "" };
    const pase = {
      id: nuevoId("pase", "Q"), codigo, coloniaId: R.vivienda(datos.viviendaId).coloniaId,
      viviendaId: datos.viviendaId, fecha: datos.fecha, modalidad: datos.modalidad,
      visitanteId, placa: datos.modalidad === "VEHICULAR" ? datos.placa : null,
      estado: "EMITIDO", creado: store.ahora(),
    };
    estado.pases.unshift(pase);
    store.auditar(`vecino ${datos.viviendaId}`, "creó pase", pase.codigo);
    guardar();
    return pase;
  };

  R.revocarPase = function (codigo) {
    const p = R.pase(codigo);
    if (p && p.estado === "EMITIDO") { p.estado = "REVOCADO"; guardar(); }
    return p;
  };

  // Coincidencia sugerida (RF-10): visita con esa placa que estaba dentro a esa hora,
  // o la más cercana en una ventana de 12 h. Nunca se asocia sola.
  R.sugerirVisita = function (placa, fechaHora) {
    if (!placa) return null;
    const cand = estado.visitas.filter((v) => v.placa === placa);
    const dentroEnHora = cand.find((v) => v.entrada <= fechaHora && (v.salida || store.ahora()) >= fechaHora);
    if (dentroEnHora) return dentroEnHora;
    let mejor = null, dist = 12 * H;
    cand.forEach((v) => {
      const d = Math.min(Math.abs(v.entrada - fechaHora), Math.abs((v.salida || store.ahora()) - fechaHora));
      if (d < dist) { dist = d; mejor = v; }
    });
    return mejor;
  };

  R.crearIncidente = function (datos) {
    const n = estado.seq.incidente++;
    const sugerida = R.sugerirVisita(datos.placa, datos.fechaHora);
    const inc = {
      id: `I${String(n).padStart(3, "0")}`, folio: `INC-${String(n).padStart(4, "0")}`,
      coloniaId: R.vivienda(datos.reportadoPor).coloniaId,
      placa: datos.placa || null, rasgos: datos.rasgos || "", tipo: datos.tipo, lugar: datos.lugar,
      fechaHora: datos.fechaHora, relato: datos.relato, evidencia: !!datos.evidencia,
      estado: "ABIERTO", visitaSugeridaId: sugerida ? sugerida.id : null, visitaAsociadaId: null,
      notas: [], reportadoPor: datos.reportadoPor, creado: store.ahora(),
    };
    estado.incidentes.unshift(inc);
    guardar();
    return inc;
  };

  R.actualizarIncidente = function (id, cambios, nota) {
    const inc = R.incidente(id);
    Object.assign(inc, cambios);
    if (nota) inc.notas.push({ fechaHora: store.ahora(), texto: nota });
    store.auditar("supervisor", "actualizó incidente", inc.folio);
    guardar();
    return inc;
  };

  // Pases que un visitante «presenta» en una garita: los de su colonia, hoy o próximos.
  R.pasesParaEscanear = function (coloniaId) {
    return estado.pases
      .filter((p) => p.coloniaId === coloniaId)
      .sort((a, b) => b.creado - a.creado);
  };

  /* ---------- Indicadores (RF-08, §11) ---------- */
  R.indicadores = function (filtro, dias) {
    const ahora = store.ahora();
    const desde = ahora - dias * D;
    const enRango = estado.visitas.filter((v) => R.enFiltro(v, filtro) && v.entrada >= desde && v.entrada <= ahora);
    const finalizadas = enRango.filter((v) => v.estado === "FINALIZADA");
    const prom = finalizadas.length ? finalizadas.reduce((a, v) => a + (v.salida - v.entrada), 0) / finalizadas.length : 0;
    const porHora = Array(24).fill(0);
    enRango.forEach((v) => { porHora[T.horaDelDia(v.entrada)]++; });
    const porVivienda = {};
    enRango.forEach((v) => { porVivienda[v.viviendaId] = (porVivienda[v.viviendaId] || 0) + 1; });
    const ranking = Object.entries(porVivienda).sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([id, n]) => ({ vivienda: R.vivienda(id), n }));
    const conPase = enRango.filter((v) => v.origen === "PASE").length;
    const colonia = R.coloniaDeFiltro(filtro);
    const incidentes = estado.incidentes.filter((i) => !colonia || i.coloniaId === colonia);
    return {
      ocupacion: R.ocupacion(filtro),
      visitas: enRango.length,
      promedio: prom,
      porHora, ranking,
      pctPase: enRango.length ? Math.round((conPase / enRango.length) * 100) : 0,
      prolongadas: R.dentro(filtro).filter(R.prolongada).sort((a, b) => a.entrada - b.entrada),
      incidentesAbiertos: incidentes.filter((i) => i.estado === "ABIERTO" || i.estado === "EN REVISIÓN"),
    };
  };

  R.porGarita = function (dias) {
    const ahora = store.ahora(), desde = ahora - dias * D;
    return estado.garitas.map((g) => {
      const v = estado.visitas.filter((x) => x.garitaEntradaId === g.id && x.entrada >= desde && x.entrada <= ahora);
      return {
        garita: g, colonia: R.colonia(g.coloniaId), visitas: v.length,
        dentro: estado.visitas.filter((x) => x.estado === "DENTRO" && x.garitaEntradaId === g.id).length,
        conPase: v.filter((x) => x.origen === "PASE").length,
      };
    });
  };
})();
