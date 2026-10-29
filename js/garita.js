/*
 * Garita (rol Guardia): P02 entrada, P03 salida, P04 escanear pase.
 * Lienzo fijo de tablet 1180 × 820; ver convenciones-ui §4.
 */
(function () {
  const { esc, icono, placa, quien, estado, fichaDestino, vacio, aviso } = Pluma.UI;
  const S = Pluma.store, R = Pluma.R, T = Pluma.T;

  const nuevaEntrada = () => ({ llegadaId: null, modalidad: null, fase: "espera", placa: "", lectura: "", revisada: false, busqueda: "", viviendaId: null, nombre: "", dpi4: "", dicho: "", duplicada: null });
  let ent = nuevaEntrada();
  let sal = { busqueda: "", visitaId: null };
  let pas = { codigo: "", resultado: null, placaObservada: "", llegadaId: null, identidad: false };
  let ultimo = null; // id de visita recién tocada, para marcarla en la bitácora
  Pluma.reiniciarVistas.push(() => { ent = nuevaEntrada(); sal = { busqueda: "", visitaId: null }; pas = { codigo: "", resultado: null, placaObservada: "", llegadaId: null, identidad: false }; ultimo = null; });

  const garita = () => R.garita(S.e.sesion.garitaId);

  /* ---------- Marco común ---------- */

  function marco(modo, contenido) {
    const g = garita();
    const oc = R.ocupacion(g.coloniaId);
    const modos = [
      ["entrada", "Entrada", "#/garita/entrada", "entrada"],
      ["salida", "Salida", "#/garita/salida", "salida"],
      ["pase", "Escanear pase", "#/garita/pase", "qr"],
    ];
    return `<div class="garita">
      <header class="g-barra">
        <div class="g-lugar"><strong>${esc(g.nombre)}</strong><span>${esc(R.colonia(g.coloniaId).nombre)}</span></div>
        <div class="g-guardia">Turno de ${esc(g.guardia)}</div>
        <div class="g-ocupacion" title="Visitas abiertas en toda la colonia">
          <span>Dentro</span><strong>${oc.vehiculos}</strong>${icono("auto")}<strong>${oc.peatones}</strong>${icono("peaton")}
        </div>
        <div class="g-hora num" data-reloj>${T.hora(S.ahora())}</div>
      </header>
      <div class="g-cuerpo">
        <section class="g-carril" aria-label="Carril">${contenido}</section>
        <aside class="g-bitacora" aria-labelledby="t-bitacora">${bitacora(g)}</aside>
      </div>
      <nav class="g-modos" aria-label="Modo de la garita">
        ${modos.map(([id, txt, href, ico]) => `<a href="${href}" class="${id === modo ? "activo" : ""}" ${id === modo ? 'aria-current="page"' : ""}>${icono(ico)}${txt}</a>`).join("")}
      </nav>
    </div>`;
  }

  function bitacora(g) {
    const ev = R.bitacora(g.id);
    const filas = ev.slice(0, 40).map((x) => {
      const v = x.visita, viv = R.vivienda(v.viviendaId);
      const nuevo = ultimo === v.id && ev.find((y) => y.visita.id === v.id) === x;
      return `<li class="b-fila b-${x.tipo} ${nuevo ? "b-nueva" : ""}">
        <span class="b-hora num">${T.hora(x.t)}</span>
        <span class="b-tipo">${x.tipo === "entrada" ? "entró" : "salió"}</span>
        <span class="b-quien">${quien(v, "xs")}</span>
        <span class="b-destino">${esc(viv.numero)}${x.tipo === "salida" ? `<em>${T.duracion(v.salida - v.entrada)}</em>` : v.origen === "PASE" ? "<em>con pase</em>" : ""}</span>
      </li>`;
    }).join("");
    return `<h2 id="t-bitacora">Bitácora del turno <span>${esc(T.fecha(S.ahora()))}</span></h2>
      ${filas ? `<ol class="bitacora">${filas}</ol>` : vacio("Aún no hay movimientos hoy en esta garita.")}`;
  }

  function llegadas(modo) {
    const g = garita();
    const lista = S.e.carril.filter((l) => l.garitaId === g.id);
    if (!lista.length) return "";
    const chip = (l) => {
      const sel = ent.llegadaId === l.id || pas.llegadaId === l.id;
      if (l.tipo === "PEATONAL") {
        const vis = R.visitante(l.visitanteId);
        return `<button type="button" class="llegada ${sel ? "sel" : ""}" data-accion="llegada" data-id="${l.id}">${icono("peaton")}<span>${esc(vis.nombre)}<small>a pie</small></span></button>`;
      }
      return `<button type="button" class="llegada ${sel ? "sel" : ""}" data-accion="llegada" data-id="${l.id}">${placa(l.placa, "xs")}<small>${l.tipo === "PASE" ? "trae pase" : "vehículo"}</small></button>`;
    };
    return `<div class="carril-llegadas"><span>Esperando en la garita</span>${lista.map(chip).join("")}</div>`;
  }

  Pluma.accion("llegada", (el) => {
    const l = S.e.carril.find((x) => x.id === el.dataset.id);
    if (!l) return;
    if (l.tipo === "PASE") {
      pas = { codigo: l.codigo, resultado: R.validarPase(l.codigo), placaObservada: l.placa, llegadaId: l.id, identidad: false };
      Pluma.ir("#/garita/pase");
      return;
    }
    ent = nuevaEntrada();
    ent.llegadaId = l.id;
    ent.dicho = l.destinoSugerido || "";
    if (l.tipo === "PEATONAL") {
      const vis = R.visitante(l.visitanteId);
      ent.modalidad = "PEATONAL";
      ent.fase = "lista";
      ent.nombre = vis.nombre;
      ent.dpi4 = String(vis.identificacion).replace(/\D/g, "").slice(-4);
    } else {
      ent.modalidad = "VEHICULAR";
      ent.fase = "leyendo";
      ent.lectura = l.lecturaOCR;
      setTimeout(() => {
        if (ent.llegadaId !== l.id) return;
        ent.fase = "lista";
        ent.placa = l.lecturaOCR;
        Pluma.render();
      }, 1300);
    }
    Pluma.ir("#/garita/entrada");
  });

  /* ---------- P02 Entrada ---------- */

  Pluma.vista(/^#\/garita\/entrada$/, "guardia", () => marco("entrada", pantallaEntrada()));

  function pantallaEntrada() {
    if (!ent.modalidad) {
      return `${llegadas("entrada")}
        <div class="carril-espera">
          <p>Toque a quien espera en la garita para tomar la foto de la placa, o registre a mano.</p>
          <div class="fila-botones">
            <button type="button" class="btn btn-grande" data-accion="ent-manual" data-modalidad="VEHICULAR">${icono("auto")}Vehículo</button>
            <button type="button" class="btn btn-grande" data-accion="ent-manual" data-modalidad="PEATONAL">${icono("peaton")}Persona a pie</button>
          </div>
        </div>`;
    }
    return `${llegadas("entrada")}<form class="registro" data-form="ingreso" autocomplete="off">
      ${ent.modalidad === "VEHICULAR" ? bloquePlaca() : bloquePeaton()}
      ${ent.fase === "lista" ? bloqueDestino() + bloqueConfirmar() : ""}
    </form>`;
  }

  function bloquePlaca() {
    if (ent.fase === "leyendo") {
      return `<div class="camara leyendo" role="status">
        ${camaraSVG()}
        <p>${icono("camara")}Leyendo la placa…</p>
      </div>`;
    }
    const p = R.normalizarPlaca(ent.placa);
    const inc = R.placaValida(p) ? R.incidentesDePlaca(p) : [];
    const corregida = ent.lectura && p !== R.normalizarPlaca(ent.lectura);
    return `<div class="placa-lectura">
      <label class="placa placa-xl placa-editable">
        <span class="placa-pais" aria-hidden="true">GUATEMALA</span>
        <input class="placa-num" name="placa" value="${esc(ent.placa)}" data-entrada="ent-placa" maxlength="9" aria-label="Placa del vehículo" spellcheck="false" ${ent.lectura ? "" : "data-autofoco"} placeholder="P-000AAA">
      </label>
      <div class="placa-nota">
        ${ent.lectura ? `<p>Lectura automática: <strong class="num">${esc(ent.lectura)}</strong>. ${corregida ? `<span class="corregida">Corregida a mano.</span>` : "Compárela con el vehículo y corríjala si hace falta."}</p>` : "<p>Escriba la placa tal como se ve en el vehículo.</p>"}
        <label class="casilla"><input type="checkbox" data-entrada="ent-revisada" ${ent.revisada ? "checked" : ""}> Revisé la placa contra el vehículo</label>
      </div>
    </div>
    ${inc.length ? `<div class="alerta alerta-pluma" role="note">${icono("aviso")}<div>
      <strong>Esta placa tiene ${inc.length === 1 ? "un reporte abierto" : `${inc.length} reportes abiertos`}</strong>
      <p>${inc.map((i) => `${esc(i.tipo)}, ${esc(T.fecha(i.fechaHora))}: ${esc(i.relato)}`).join("<br>")}</p>
      <p class="alerta-guia">Es solo un aviso. Registre el ingreso normalmente y avise al supervisor si nota algo.</p></div></div>` : ""}`;
  }

  function bloquePeaton() {
    return `<div class="peaton-datos">
      <h2>${icono("peaton")}Persona a pie</h2>
      <label class="campo"><span>Nombre del visitante</span>
        <input name="nombre" value="${esc(ent.nombre)}" data-entrada="ent-nombre" ${ent.nombre ? "" : "data-autofoco"}></label>
      <label class="campo campo-corto"><span>Últimos 4 dígitos del DPI</span>
        <input name="dpi4" value="${esc(ent.dpi4)}" data-entrada="ent-dpi" inputmode="numeric" maxlength="4" pattern="\\d{4}"></label>
      <p class="campo-ayuda">Solo se guardan los últimos 4 dígitos. Verifique el documento a la vista.</p>
    </div>`;
  }

  function bloqueDestino() {
    const viv = ent.viviendaId ? R.vivienda(ent.viviendaId) : null;
    return `<div class="destino">
      <h2>¿A qué casa va?</h2>
      ${ent.dicho && !viv ? `<p class="dicho">${ent.modalidad === "PEATONAL" ? "La visitante" : "El conductor"} dice: «Donde los ${esc(ent.dicho)}».</p>` : ""}
      ${viv ? `${fichaDestino(viv, true)}<button type="button" class="btn-texto" data-accion="ent-otro-destino">Cambiar destino</button>`
        : `<label class="campo buscador">${icono("lupa")}<input type="search" value="${esc(ent.busqueda)}" data-entrada="ent-buscar" placeholder="Apellido de la familia o número de casa" aria-label="Buscar casa" ${ent.modalidad === "VEHICULAR" && ent.revisada ? "data-autofoco" : ""}></label>
           <ul class="resultados" id="resultados">${resultados()}</ul>`}
    </div>`;
  }

  function resultados() {
    const lista = R.buscarViviendas(garita().coloniaId, ent.busqueda);
    if (ent.busqueda.trim().length >= 2 && !lista.length) return `<li class="vacio">Ninguna casa coincide con «${esc(ent.busqueda)}».</li>`;
    return lista.map((v) => `<li><button type="button" data-accion="ent-destino" data-id="${v.id}">
      <strong>Familia ${esc(v.apellidos)}</strong><span>${esc(v.direccion)}</span></button></li>`).join("");
  }

  function faltante() {
    if (ent.modalidad === "VEHICULAR") {
      if (!R.placaValida(R.normalizarPlaca(ent.placa))) return "Falta una placa válida, por ejemplo P-123ABC.";
      if (!ent.revisada) return "Marque que revisó la placa contra el vehículo.";
    } else {
      if (ent.nombre.trim().length < 3) return "Falta el nombre del visitante.";
      if (!/^\d{4}$/.test(ent.dpi4)) return "Faltan los últimos 4 dígitos del DPI.";
    }
    if (!ent.viviendaId) return "Falta elegir la casa de destino.";
    return "";
  }

  function bloqueConfirmar() {
    if (ent.duplicada) {
      const d = ent.duplicada, viv = R.vivienda(d.viviendaId);
      return `<div class="alerta alerta-pluma" role="alert">${icono("aviso")}<div>
        <strong>${esc(d.placa)} ya está dentro desde las ${T.hora(d.entrada)}</strong>
        <p>Visita abierta a ${esc(viv.numero)}, familia ${esc(viv.apellidos)}. Puede ser el mismo vehículo que nunca marcó salida.</p>
        <div class="fila-botones">
          <button type="button" class="btn btn-principal" data-accion="ent-forzar">Registrar otro ingreso</button>
          <button type="button" class="btn" data-accion="ent-cancelar">Cancelar</button>
        </div></div></div>`;
    }
    const falta = faltante();
    return `<div class="confirmar">
      <p class="falta" aria-live="polite" ${falta ? "" : "hidden"}>${icono("aviso")}<span>${esc(falta)}</span></p>
      <div class="fila-botones">
        <button type="button" class="btn btn-quieto" data-accion="ent-cancelar">Cancelar</button>
        <button type="submit" class="btn btn-principal btn-grande" ${falta ? "disabled" : ""}>Registrar ingreso</button>
      </div>
    </div>`;
  }

  // Repinta solo lo que depende de lo escrito, para no perder el foco del campo.
  function refrescarConfirmar() {
    const c = document.querySelector(".confirmar");
    if (!c) return;
    const falta = faltante();
    const nota = c.querySelector(".falta");
    nota.querySelector("span").textContent = falta;
    nota.hidden = !falta;
    c.querySelector("[type=submit]").disabled = !!falta;
  }

  Pluma.accion("ent-manual", (el) => {
    ent = nuevaEntrada();
    ent.modalidad = el.dataset.modalidad;
    ent.fase = "lista";
    Pluma.render();
  });
  Pluma.entrada("ent-placa", (el) => {
    const pos = el.selectionStart;
    ent.placa = el.value.toUpperCase();
    el.value = ent.placa;
    el.setSelectionRange(pos, pos);
    const nota = document.querySelector(".placa-nota p");
    if (nota && ent.lectura) {
      const corr = R.normalizarPlaca(ent.placa) !== R.normalizarPlaca(ent.lectura);
      nota.innerHTML = `Lectura automática: <strong class="num">${esc(ent.lectura)}</strong>. ${corr ? `<span class="corregida">Corregida a mano.</span>` : "Compárela con el vehículo y corríjala si hace falta."}`;
    }
    refrescarConfirmar();
  });
  Pluma.entrada("ent-revisada", (el) => { ent.revisada = el.checked; ent.placa = R.normalizarPlaca(ent.placa); Pluma.render(); });
  Pluma.entrada("ent-nombre", (el) => { ent.nombre = el.value; refrescarConfirmar(); });
  Pluma.entrada("ent-dpi", (el) => { ent.dpi4 = el.value.replace(/\D/g, "").slice(0, 4); el.value = ent.dpi4; refrescarConfirmar(); });
  Pluma.entrada("ent-buscar", (el) => {
    ent.busqueda = el.value;
    document.getElementById("resultados").innerHTML = resultados();
  });
  Pluma.accion("ent-destino", (el) => { ent.viviendaId = el.dataset.id; Pluma.render(); });
  Pluma.accion("ent-otro-destino", () => { ent.viviendaId = null; ent.busqueda = ""; Pluma.render(); });
  Pluma.accion("ent-cancelar", () => { ent = nuevaEntrada(); Pluma.render(); });
  Pluma.accion("ent-forzar", () => registrar(true));
  Pluma.formulario("ingreso", () => registrar(false));

  function registrar(forzar) {
    if (faltante()) return;
    const datos = {
      garitaId: garita().id, viviendaId: ent.viviendaId, modalidad: ent.modalidad, llegadaId: ent.llegadaId,
    };
    if (ent.modalidad === "VEHICULAR") {
      datos.placa = R.normalizarPlaca(ent.placa);
      if (ent.lectura && datos.placa !== R.normalizarPlaca(ent.lectura))
        datos.observaciones = `Lectura automática ${ent.lectura} corregida por el guardia.`;
    } else {
      const l = S.e.carril.find((x) => x.id === ent.llegadaId);
      if (l && l.visitanteId) datos.visitanteId = l.visitanteId;
      else { datos.nombreVisitante = ent.nombre.trim(); datos.identificacion = ent.dpi4; }
    }
    const r = R.registrarIngreso(datos, forzar);
    if (r.duplicada) { ent.duplicada = r.duplicada; Pluma.render(); return; }
    const viv = R.vivienda(r.visita.viviendaId);
    ultimo = r.visita.id;
    ent = nuevaEntrada();
    Pluma.render();
    aviso(`Ingreso registrado: ${R.nombreVisita(r.visita)} a ${viv.numero}`, "paso");
  }

  function camaraSVG() {
    const l = S.e.carril.find((x) => x.id === ent.llegadaId);
    const p = l ? l.placa : "";
    return `<svg class="camara-vista" viewBox="0 0 640 260" aria-hidden="true">
      <rect width="640" height="260" fill="#20262b"/>
      <path d="M140 230 L170 120 Q180 95 210 92 L430 92 Q460 95 470 120 L500 230 Z" fill="#3a434a"/>
      <rect x="190" y="105" width="260" height="58" rx="6" fill="#4b565e"/>
      <rect x="150" y="185" width="70" height="18" rx="4" fill="#b3261e" opacity=".8"/>
      <rect x="420" y="185" width="70" height="18" rx="4" fill="#b3261e" opacity=".8"/>
      <g transform="translate(260 178)"><rect width="120" height="44" rx="4" fill="#f6f7f4" stroke="#14181b"/>
        <rect width="120" height="10" rx="2" fill="#1f4e9c"/>
        <text x="60" y="36" text-anchor="middle" font-family="Barlow Condensed, sans-serif" font-weight="700" font-size="22" fill="#14181b">${esc(p)}</text></g>
      <rect class="barrido" x="250" y="170" width="140" height="60" fill="none" stroke="#f2b705" stroke-width="3"/>
    </svg>`;
  }

  /* ---------- P03 Salida ---------- */

  Pluma.vista(/^#\/garita\/salida$/, "guardia", () => marco("salida", pantallaSalida()));

  function listaDentro() {
    const g = garita();
    const q = sal.busqueda.trim().toLowerCase();
    const lista = R.dentro(g.coloniaId)
      .filter((v) => !q || R.nombreVisita(v).toLowerCase().replace(/-/g, "").includes(q.replace(/-/g, "")))
      .sort((a, b) => b.entrada - a.entrada);
    if (!lista.length) return `<li class="vacio">${q ? `Nadie dentro coincide con «${esc(sal.busqueda)}».` : "No hay visitas dentro. Las entradas aparecerán aquí."}</li>`;
    return lista.map((v) => {
      const viv = R.vivienda(v.viviendaId);
      return `<li><button type="button" class="dentro-fila" data-accion="sal-elegir" data-id="${v.id}">
        <span class="df-quien">${quien(v, "s")}</span>
        <span class="df-casa">${esc(viv.numero)}<small>${esc(viv.apellidos.split(" ")[0])}</small></span>
        <span class="df-hora num">desde ${T.hora(v.entrada)}${T.mismoDia(v.entrada, S.ahora()) ? "" : `, ${esc(T.fecha(v.entrada))}`}</span>
        <span class="df-dur num" data-desde="${v.entrada}">${T.duracion(R.duracion(v))}</span>
        ${R.prolongada(v) ? estado("PROLONGADA") : ""}
      </button></li>`;
    }).join("");
  }

  function pantallaSalida() {
    const v = sal.visitaId ? R.visita(sal.visitaId) : null;
    if (v && v.estado === "DENTRO") {
      const viv = R.vivienda(v.viviendaId);
      const ge = R.garita(v.garitaEntradaId);
      return `<div class="salida-detalle">
        <div class="sd-quien">${v.modalidad === "VEHICULAR" ? placa(v.placa, "xl") : `<p class="peaton peaton-grande">${icono("peaton")}${esc(R.nombreVisita(v))}</p>`}</div>
        <dl class="datos">
          <div><dt>Visitó</dt><dd>${esc(viv.numero)}, familia ${esc(viv.apellidos)}</dd></div>
          <div><dt>Entró</dt><dd class="num">${esc(T.fecha(v.entrada))}, ${T.hora(v.entrada)} por ${esc(ge.nombre)}</dd></div>
          <div><dt>Lleva dentro</dt><dd class="num dur-grande" data-desde="${v.entrada}">${T.duracion(R.duracion(v))}</dd></div>
        </dl>
        ${R.prolongada(v) ? `<div class="alerta alerta-pluma" role="note">${icono("aviso")}<div><strong>Visita prolongada</strong><p>Supera el límite de ${S.e.umbralHoras} h de la colonia. Confirme la salida normalmente; el supervisor ya tiene el aviso.</p></div></div>` : ""}
        <div class="fila-botones">
          <button type="button" class="btn btn-quieto" data-accion="sal-volver">Volver a la lista</button>
          <button type="button" class="btn btn-principal btn-grande" data-accion="sal-confirmar">Confirmar salida</button>
        </div>
      </div>`;
    }
    return `<div class="salida-lista">
      <label class="campo buscador">${icono("lupa")}<input type="search" value="${esc(sal.busqueda)}" data-entrada="sal-buscar" placeholder="Placa o nombre de quien sale" aria-label="Buscar visita dentro" data-autofoco></label>
      <ul class="dentro" id="dentro">${listaDentro()}</ul>
    </div>`;
  }

  Pluma.entrada("sal-buscar", (el) => { sal.busqueda = el.value; document.getElementById("dentro").innerHTML = listaDentro(); });
  Pluma.accion("sal-elegir", (el) => { sal.visitaId = el.dataset.id; Pluma.render(); });
  Pluma.accion("sal-volver", () => { sal.visitaId = null; Pluma.render(); });
  Pluma.accion("sal-confirmar", () => {
    const v = R.registrarSalida(sal.visitaId, garita().id);
    if (!v) return;
    ultimo = v.id;
    sal = { busqueda: "", visitaId: null };
    Pluma.render();
    aviso(`Salida confirmada: ${R.nombreVisita(v)}. Duración: ${T.duracion(v.salida - v.entrada)}`, "paso");
  });

  /* ---------- P04 Escanear pase ---------- */

  Pluma.vista(/^#\/garita\/pase$/, "guardia", () => marco("pase", pantallaPase()));

  const MENSAJES = {
    NO_EXISTE: ["freno", "No hay ningún pase con ese código", "Revise que esté bien escrito o registre el ingreso a mano."],
    REVOCADO: ["freno", "Pase revocado", "El vecino canceló este pase. Llame a la casa antes de dejar pasar."],
    UTILIZADO: ["freno", "Este pase ya se usó", ""],
    VENCIDO: ["freno", "Pase vencido", ""],
    FUTURO: ["pluma", "Todavía no es válido", ""],
    VALIDO: ["paso", "Pase válido para hoy", "Verifique la identidad del visitante y confirme el ingreso."],
  };

  function pantallaPase() {
    if (!pas.resultado) {
      const g = garita();
      const pases = R.pasesParaEscanear(g.coloniaId).slice(0, 6);
      return `${llegadas("pase")}<div class="escaner">
        <div class="visor" aria-hidden="true">${icono("qr")}<span>Acerque el código del visitante</span></div>
        <form class="escaner-manual" data-form="pase-codigo" autocomplete="off">
          <label class="campo"><span>O escriba el código del pase</span><input name="codigo" value="${esc(pas.codigo)}" placeholder="PL-XXXXXX" data-autofoco spellcheck="false"></label>
          <button type="submit" class="btn btn-principal">Validar</button>
        </form>
        <div class="simular">
          <h2>Simular escaneo</h2>
          <ul>${pases.map((p) => {
            const vis = R.visitante(p.visitanteId);
            return `<li><button type="button" data-accion="pase-simular" data-codigo="${p.codigo}">
              <span class="num">${p.codigo}</span><span>${esc(vis.nombre)}</span><span>${esc(T.fecha(p.fecha))}</span></button></li>`;
          }).join("")}</ul>
        </div>
      </div>`;
    }
    const { resultado, pase: p } = pas.resultado;
    const [tono, titulo, guia] = MENSAJES[resultado];
    let detalle = guia;
    if (resultado === "UTILIZADO") detalle = `Se usó el ${T.fecha(p.usadoEn)} a las ${T.hora(p.usadoEn)}. No se registra una segunda visita. Pida al vecino un pase nuevo.`;
    if (resultado === "VENCIDO") detalle = `Era válido el ${T.fecha(p.fecha)}. Pida al vecino un pase nuevo o registre el ingreso a mano.`;
    if (resultado === "FUTURO") detalle = `Es válido el ${T.fechaLarga(p.fecha)}. Hoy no permite el ingreso.`;
    let cuerpo = "";
    if (p) {
      const vis = R.visitante(p.visitanteId), viv = R.vivienda(p.viviendaId);
      const obs = R.normalizarPlaca(pas.placaObservada);
      const difiere = p.modalidad === "VEHICULAR" && obs && obs !== p.placa;
      cuerpo = `<div class="pase-datos">
        <dl class="datos">
          <div><dt>Visitante</dt><dd>${esc(vis.nombre)} <span class="num tenue">DPI ${R.enmascarar(vis.identificacion)}</span></dd></div>
          <div><dt>Destino</dt><dd>${fichaDestino(viv, resultado === "VALIDO")}</dd></div>
          <div><dt>Viene</dt><dd>${p.modalidad === "VEHICULAR" ? `en vehículo ${placa(p.placa, "s")}` : "a pie"}</dd></div>
        </dl>
        ${resultado === "VALIDO" && p.modalidad === "VEHICULAR" ? `
          <label class="campo campo-corto"><span>Placa del vehículo que llega</span>
            <input class="num" value="${esc(pas.placaObservada || p.placa)}" data-entrada="pase-placa" spellcheck="false"></label>
          <div id="discrepancia">${difiere ? discrepancia(p, obs) : ""}</div>` : ""}
        ${resultado === "VALIDO" ? `<label class="casilla"><input type="checkbox" data-entrada="pase-identidad" ${pas.identidad ? "checked" : ""}> Verifiqué la identidad con el documento</label>` : ""}
      </div>`;
    }
    return `<div class="pase-resultado">
      <div class="veredicto veredicto-${tono}" role="status">${icono(tono === "paso" ? "check" : "aviso")}<div><strong>${titulo}</strong><p>${esc(detalle)}</p></div><span class="num">${esc(pas.codigo)}</span></div>
      ${cuerpo}
      <div class="fila-botones">
        <button type="button" class="btn btn-quieto" data-accion="pase-otro">Escanear otro</button>
        ${resultado === "VALIDO" ? `<button type="button" class="btn btn-principal btn-grande" data-accion="pase-confirmar" ${pas.identidad ? "" : "disabled"}>Confirmar ingreso</button>` : ""}
      </div>
    </div>`;
  }

  function discrepancia(p, obs) {
    return `<div class="alerta alerta-pluma" role="note">${icono("aviso")}<div>
      <strong>La placa no coincide con el pase</strong>
      <p>Llega en ${esc(obs)}; el pase es para ${esc(p.placa)}. Llame a la casa para confirmar antes de dejar pasar. Si confirma, el ingreso queda con la placa que llegó.</p></div></div>`;
  }

  Pluma.formulario("pase-codigo", (f, d) => {
    pas = { codigo: d.codigo.trim().toUpperCase(), resultado: R.validarPase(d.codigo), placaObservada: "", llegadaId: null, identidad: false };
    Pluma.render();
  });
  Pluma.accion("pase-simular", (el) => {
    pas = { codigo: el.dataset.codigo, resultado: R.validarPase(el.dataset.codigo), placaObservada: "", llegadaId: null, identidad: false };
    Pluma.render();
  });
  Pluma.entrada("pase-placa", (el) => {
    pas.placaObservada = el.value.toUpperCase();
    const p = pas.resultado.pase, obs = R.normalizarPlaca(pas.placaObservada);
    document.getElementById("discrepancia").innerHTML = obs && obs !== p.placa ? discrepancia(p, obs) : "";
  });
  Pluma.entrada("pase-identidad", (el) => {
    pas.identidad = el.checked;
    const b = document.querySelector("[data-accion=pase-confirmar]");
    if (b) b.disabled = !el.checked;
  });
  Pluma.accion("pase-otro", () => { pas = { codigo: "", resultado: null, placaObservada: "", llegadaId: null, identidad: false }; Pluma.render(); });
  Pluma.accion("pase-confirmar", () => {
    const obs = R.normalizarPlaca(pas.placaObservada) || null;
    const r = R.canjearPase(pas.codigo, garita().id, obs, pas.llegadaId);
    if (r.resultado !== "CANJEADO") { pas.resultado = R.validarPase(pas.codigo); Pluma.render(); return; }
    ultimo = r.visita.id;
    pas = { codigo: "", resultado: null, placaObservada: "", llegadaId: null, identidad: false };
    Pluma.render();
    aviso(`Ingreso registrado con pase: ${R.nombreVisita(r.visita)} a ${R.vivienda(r.visita.viviendaId).numero}`, "paso");
  });
})();
