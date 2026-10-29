/*
 * Vecino (P05, P06, P08, consulta de placa) y Visitante (P07).
 * El vecino de la demo es la familia López, Casa 18, Residenciales Los Cipreses.
 */
(function () {
  const { esc, icono, placa, quien, estado, vacio, aviso, qr } = Pluma.UI;
  const S = Pluma.store, R = Pluma.R, T = Pluma.T;
  const CASA = "cip-18";

  let consulta = { placa: "", respuesta: null };
  let nuevoPase = { modalidad: "VEHICULAR" };
  let reporte = { evidencia: false, placa: "" };
  Pluma.reiniciarVistas.push(() => { consulta = { placa: "", respuesta: null }; nuevoPase = { modalidad: "VEHICULAR" }; reporte = { evidencia: false, placa: "" }; });

  function marcoVecino(activo, contenido) {
    const viv = R.vivienda(CASA);
    const nav = [
      ["inicio", "Mis visitas", "#/vecino", "casa"],
      ["pase", "Crear pase", "#/vecino/pase", "qr"],
      ["incidente", "Reportar", "#/vecino/incidente", "aviso"],
      ["placa", "Consultar placa", "#/vecino/placa", "lupa"],
    ];
    return `<div class="app app-vecino">
      <header class="app-cabecera">
        <a class="app-marca" href="#/vecino">Pluma</a>
        <div class="app-quien">${icono("casa")}<span><strong>${esc(viv.numero)}, familia López</strong><small>${esc(R.colonia(viv.coloniaId).nombre)}</small></span></div>
      </header>
      <nav class="app-nav" aria-label="Secciones">${nav.map(([id, t, h, ico]) => `<a href="${h}" ${id === activo ? 'aria-current="page"' : ""}>${icono(ico)}${t}</a>`).join("")}</nav>
      <main class="app-contenido">${contenido}</main>
    </div>`;
  }

  /* ---------- P05 Mis visitas ---------- */

  Pluma.vista(/^#\/vecino$/, "vecino", () => {
    const viv = R.vivienda(CASA);
    const oc = R.ocupacion(viv.coloniaId);
    const mias = S.e.visitas.filter((v) => v.viviendaId === CASA && v.entrada <= S.ahora()).sort((a, b) => b.entrada - a.entrada);
    const dentro = mias.filter((v) => v.estado === "DENTRO");
    const recientes = mias.filter((v) => v.estado !== "DENTRO").slice(0, 6);
    const pases = S.e.pases.filter((p) => p.viviendaId === CASA).slice(0, 6);
    const fila = (v) => `<li class="visita-fila">${quien(v, "s")}
      <span class="vf-cuando num">${v.estado === "DENTRO" ? `desde ${T.hora(v.entrada)}` : `${esc(T.fecha(v.entrada))}, ${T.hora(v.entrada)}–${T.hora(v.salida)}`}</span>
      <span class="vf-dur num" ${v.estado === "DENTRO" ? `data-desde="${v.entrada}"` : ""}>${T.duracion(R.duracion(v))}</span>
      ${estado(v.estado)}</li>`;
    return marcoVecino("inicio", `
      <section class="resumen-colonia">
        <p><strong class="cifra">${oc.total}</strong> visitas dentro de la colonia ahora</p>
        <p class="tenue">${oc.vehiculos} en vehículo y ${oc.peatones} a pie. Solo ve el total; los destinos de otras casas son privados.</p>
      </section>
      <a class="btn btn-principal btn-ancho" href="#/vecino/pase">${icono("qr")}Crear pase para una visita</a>
      <section aria-labelledby="t-dentro"><h2 id="t-dentro">En su casa ahora</h2>
        ${dentro.length ? `<ul class="visitas">${dentro.map(fila).join("")}</ul>` : vacio("Nadie está de visita en su casa en este momento.")}</section>
      <section aria-labelledby="t-pases"><h2 id="t-pases">Sus pases</h2>
        ${pases.length ? `<ul class="pases">${pases.map((p) => {
          const vis = R.visitante(p.visitanteId);
          const est = R.estadoPase(p);
          return `<li class="pase-fila"><a href="#/pase/${p.codigo}"><span class="num">${p.codigo}</span><span>${esc(vis.nombre)}</span>
            <span class="num">${esc(T.fecha(p.fecha))}</span>${estado(est)}</a>
            ${est === "EMITIDO" ? `<button type="button" class="btn-texto" data-accion="revocar" data-codigo="${p.codigo}">Revocar</button>` : ""}</li>`;
        }).join("")}</ul>` : vacio("Aún no ha creado pases. Cree uno y compártalo con su visita.")}</section>
      <section aria-labelledby="t-recientes"><h2 id="t-recientes">Visitas recientes</h2>
        ${recientes.length ? `<ul class="visitas">${recientes.map(fila).join("")}</ul>` : vacio("Sin visitas en los últimos días.")}</section>
    `);
  });

  Pluma.accion("revocar", (el) => {
    R.revocarPase(el.dataset.codigo);
    Pluma.render();
    aviso(`Pase ${el.dataset.codigo} revocado`, "azul");
  });

  /* ---------- P06 Crear pase ---------- */

  Pluma.vista(/^#\/vecino\/pase$/, "vecino", () => {
    const manana = S.ahora() + T.D;
    const veh = nuevoPase.modalidad === "VEHICULAR";
    return marcoVecino("pase", `
      <h1>Crear pase</h1>
      <p class="tenue">El pase sirve una sola vez, el día que elija. Su visita lo muestra en la garita y entra sin esperar.</p>
      <form class="formulario" data-form="crear-pase" autocomplete="off">
        <fieldset class="segmentado"><legend>Su visita viene</legend>
          <label><input type="radio" name="modalidad" value="VEHICULAR" data-entrada="pase-modalidad" ${veh ? "checked" : ""}>${icono("auto")}En vehículo</label>
          <label><input type="radio" name="modalidad" value="PEATONAL" data-entrada="pase-modalidad" ${veh ? "" : "checked"}>${icono("peaton")}A pie</label>
        </fieldset>
        <label class="campo"><span>Día de la visita</span>
          <input type="date" name="fecha" required min="${T.aInput(S.ahora())}" value="${T.aInput(manana)}"></label>
        <label class="campo"><span>Nombre completo del visitante</span>
          <input name="nombre" required minlength="3" placeholder="Como aparece en su DPI"></label>
        <label class="campo campo-corto"><span>Últimos 4 dígitos del DPI <small>opcional</small></span>
          <input name="dpi4" inputmode="numeric" maxlength="4" pattern="\\d{4}"></label>
        ${veh ? `<label class="campo campo-corto"><span>Placa del vehículo</span>
          <input name="placa" required placeholder="P-456DEF" spellcheck="false" class="num"></label>
          <label class="campo"><span>Vehículo <small>opcional</small></span><input name="vehiculo" placeholder="Marca y color"></label>` : ""}
        <p class="campo-ayuda">El guardia verá el nombre, la placa y su casa. El código no lleva datos personales.</p>
        <button type="submit" class="btn btn-principal btn-ancho">Crear pase</button>
      </form>`);
  });

  Pluma.entrada("pase-modalidad", (el) => { nuevoPase.modalidad = el.value; Pluma.render(); });
  Pluma.formulario("crear-pase", (f, d) => {
    const placaN = d.placa ? R.normalizarPlaca(d.placa) : null;
    if (nuevoPase.modalidad === "VEHICULAR" && !R.placaValida(placaN)) {
      aviso("La placa no tiene un formato válido. Ejemplo: P-456DEF", "freno");
      f.placa.focus();
      return;
    }
    const pase = R.crearPase({
      viviendaId: CASA, fecha: T.desdeInput(d.fecha), modalidad: nuevoPase.modalidad,
      nombre: d.nombre.trim(), identificacion: d.dpi4 || "", placa: placaN, vehiculo: d.vehiculo,
    });
    aviso(`Pase creado para el ${T.fecha(pase.fecha)}`, "paso");
    Pluma.ir(`#/vecino/pase/${pase.codigo}`);
  });

  // Pase recién creado, vista del vecino con opción de compartir.
  Pluma.vista(/^#\/vecino\/pase\/([A-Z0-9-]+)$/, "vecino", (codigo) => {
    const p = R.pase(codigo);
    if (!p) return marcoVecino("pase", vacio("Ese pase no existe."));
    return marcoVecino("pase", `
      <h1>Pase creado</h1>
      ${boleto(p)}
      <div class="fila-botones fila-apilada">
        <button type="button" class="btn btn-principal" data-accion="compartir" data-codigo="${p.codigo}">Compartir por WhatsApp</button>
        <a class="btn" href="#/pase/${p.codigo}" data-accion="ver-como-visitante">Ver como visitante</a>
        <a class="btn btn-quieto" href="#/vecino">Volver a mis visitas</a>
      </div>`);
  });
  Pluma.accion("compartir", (el) => aviso(`Enlace del pase ${el.dataset.codigo} listo para enviar (simulado)`, "azul"));

  /* ---------- P07 Pase del visitante ---------- */

  function boleto(p) {
    const vis = R.visitante(p.visitanteId), viv = R.vivienda(p.viviendaId);
    const est = R.estadoPase(p);
    const hoy = T.compararDia(S.ahora(), p.fecha);
    const instruccion = {
      EMITIDO: hoy < 0 ? `Muéstrelo en la garita el ${T.fechaLarga(p.fecha)}.` : "Muéstrelo al guardia al llegar. Lleve su DPI.",
      UTILIZADO: `Se usó el ${T.fecha(p.usadoEn)} a las ${T.hora(p.usadoEn)}.`,
      VENCIDO: "Ya no es válido. Pida un pase nuevo a quien lo invitó.",
      REVOCADO: "Quien lo invitó canceló este pase.",
    }[est];
    return `<article class="boleto boleto-${est.toLowerCase()}" aria-label="Pase de acceso">
      <div class="boleto-qr">${qr(p.codigo, 188)}<span class="num">${p.codigo}</span></div>
      <div class="boleto-datos">
        <p class="boleto-fecha">${esc(T.fechaLarga(p.fecha))}</p>
        <dl>
          <div><dt>Visitante</dt><dd>${esc(vis.nombre)}</dd></div>
          <div><dt>Destino</dt><dd>${esc(R.colonia(p.coloniaId).nombre)}, ${esc(viv.numero)}</dd></div>
          <div><dt>Viene</dt><dd>${p.modalidad === "VEHICULAR" ? placa(p.placa, "s") : "a pie"}</dd></div>
        </dl>
        <p class="boleto-estado">${estado(est)} ${esc(instruccion)}</p>
      </div>
    </article>`;
  }

  Pluma.vista(/^#\/pase\/([A-Z0-9-]+)$/, "visitante", (codigo) => {
    const p = R.pase(codigo);
    return `<div class="app app-visitante"><main class="app-contenido">
      <p class="app-marca">Pluma</p>
      ${p ? `<h1>Su pase de acceso</h1>${boleto(p)}
        <p class="tenue">Este pase sirve una sola vez. Si cambia de vehículo, avise a quien lo invitó.</p>`
        : `<h1>Pase no encontrado</h1>${vacio("Revise el enlace que le enviaron o pida uno nuevo.")}`}
      <p><a class="btn-texto" href="#/visitante">Ver otros pases de la demo</a></p>
    </main></div>`;
  });

  // Sin login: en la demo el visitante elige cuál de los pases «recibió».
  Pluma.vista(/^#\/visitante$/, "visitante", () => {
    const pases = S.e.pases.slice(0, 8);
    return `<div class="app app-visitante"><main class="app-contenido">
      <p class="app-marca">Pluma</p>
      <h1>Pases recibidos</h1>
      <p class="tenue">En la vida real el visitante abre el enlace que le comparte el vecino. Aquí puede elegir uno.</p>
      <ul class="pases">${pases.map((p) => `<li class="pase-fila"><a href="#/pase/${p.codigo}"><span class="num">${p.codigo}</span>
        <span>${esc(R.visitante(p.visitanteId).nombre)}</span><span class="num">${esc(T.fecha(p.fecha))}</span>${estado(R.estadoPase(p))}</a></li>`).join("")}</ul>
    </main></div>`;
  });

  /* ---------- P08 Reportar incidente ---------- */

  const TIPOS = ["Exceso de velocidad", "Ruido", "Estacionamiento indebido", "Daños a propiedad", "Conducta sospechosa", "Otro"];

  Pluma.vista(/^#\/vecino\/incidente$/, "vecino", () => {
    const ahora = S.ahora();
    return marcoVecino("incidente", `
      <h1>Reportar incidente</h1>
      <p class="tenue">Seguridad revisa cada reporte. Su nombre no se comparte con la persona reportada.</p>
      <form class="formulario" data-form="reportar" autocomplete="off">
        <label class="campo campo-corto"><span>Placa <small>si la vio</small></span>
          <input name="placa" class="num" value="${esc(reporte.placa)}" placeholder="P-789GHI" spellcheck="false"></label>
        <label class="campo"><span>Si no vio la placa, describa el vehículo o la persona</span>
          <input name="rasgos" placeholder="Pick-up blanco con barra antivuelco"></label>
        <label class="campo"><span>Qué pasó</span>
          <select name="tipo" required>${TIPOS.map((t) => `<option>${t}</option>`).join("")}</select></label>
        <label class="campo"><span>Dónde</span><input name="lugar" required placeholder="Sector B, frente al parque"></label>
        <div class="campo-doble">
          <label class="campo"><span>Día</span><input type="date" name="dia" required value="${T.aInput(ahora)}" max="${T.aInput(ahora)}"></label>
          <label class="campo"><span>Hora aproximada</span><input type="time" name="hora" required value="${T.hora(ahora - 20 * T.MIN)}"></label>
        </div>
        <label class="campo"><span>Relato</span><textarea name="relato" required rows="3" placeholder="Cuente lo que vio, sin suposiciones."></textarea></label>
        <div class="evidencia">
          ${reporte.evidencia ? `<p>${icono("camara")}Foto adjunta (simulada) <button type="button" class="btn-texto" data-accion="evidencia">Quitar</button></p>`
            : `<button type="button" class="btn btn-quieto" data-accion="evidencia">${icono("camara")}Adjuntar foto</button>`}
        </div>
        <button type="submit" class="btn btn-principal btn-ancho">Enviar reporte</button>
      </form>`);
  });

  Pluma.accion("evidencia", () => {
    const f = document.querySelector("[data-form=reportar]");
    if (f) reporte.placa = f.placa.value;
    reporte.evidencia = !reporte.evidencia;
    Pluma.render();
  });
  Pluma.formulario("reportar", (f, d) => {
    const placaN = d.placa ? R.normalizarPlaca(d.placa) : null;
    if (!placaN && !d.rasgos.trim()) { aviso("Indique la placa o describa el vehículo o la persona.", "freno"); return; }
    const fechaHora = Date.parse(`${d.dia}T${d.hora}:00-06:00`);
    const inc = R.crearIncidente({
      reportadoPor: CASA, placa: placaN, rasgos: d.rasgos.trim(), tipo: d.tipo, lugar: d.lugar.trim(),
      fechaHora: Math.min(fechaHora, S.ahora()), relato: d.relato.trim(), evidencia: reporte.evidencia,
    });
    reporte = { evidencia: false, placa: "" };
    Pluma.ir(`#/vecino/incidente/${inc.id}`);
  });

  Pluma.vista(/^#\/vecino\/incidente\/(I\d+)$/, "vecino", (id) => {
    const inc = R.incidente(id);
    return marcoVecino("incidente", `
      <div class="confirmacion">${icono("check")}
        <h1>Reporte enviado</h1>
        <p>Folio <strong class="num">${esc(inc.folio)}</strong>. Seguridad lo revisará y verá si coincide con alguna visita registrada.</p>
        <p class="tenue">Un reporte no acusa a nadie: el supervisor verifica antes de asociarlo a una visita.</p>
        <a class="btn btn-quieto" href="#/vecino">Volver a mis visitas</a>
      </div>`);
  });

  /* ---------- Consultar placa (§7, E7) ---------- */

  Pluma.vista(/^#\/vecino\/placa$/, "vecino", () => {
    const r = consulta.respuesta;
    let resultado = "";
    if (r && r.propia) {
      resultado = `<div class="respuesta">${placa(r.placa, "m")}<p>Visitó su casa ${r.visita.estado === "DENTRO" ? `y sigue dentro desde las ${T.hora(r.visita.entrada)}` : `el ${T.fecha(r.visita.entrada)}`}.</p></div>`;
    } else if (r) {
      resultado = `<div class="respuesta respuesta-privada">${icono("escudo")}<div>
        <p><strong>Por privacidad no mostramos a qué casa visita otro vehículo.</strong></p>
        <p>Si le preocupa algo de ${esc(r.placa)}, repórtelo: seguridad lo revisa con los registros de la garita.</p>
        <button type="button" class="btn btn-principal" data-accion="reportar-placa" data-placa="${esc(r.placa)}">Reportar esta placa</button></div></div>`;
    }
    return marcoVecino("placa", `
      <h1>Consultar una placa</h1>
      <p class="tenue">Puede consultar placas de visitas a su casa. Para cualquier otra, seguridad responde por usted.</p>
      <form class="formulario formulario-linea" data-form="consultar-placa" autocomplete="off">
        <label class="campo campo-corto"><span>Placa</span><input name="placa" class="num" value="${esc(consulta.placa)}" placeholder="P-789GHI" required spellcheck="false" data-autofoco></label>
        <button type="submit" class="btn">Consultar</button>
      </form>
      ${resultado}`);
  });

  Pluma.formulario("consultar-placa", (f, d) => {
    const p = R.normalizarPlaca(d.placa);
    const propia = S.e.visitas.filter((v) => v.placa === p && v.viviendaId === CASA).sort((a, b) => b.entrada - a.entrada)[0];
    consulta = { placa: p, respuesta: { placa: p, propia: !!propia, visita: propia } };
    Pluma.render();
  });
  Pluma.accion("reportar-placa", (el) => { reporte.placa = el.dataset.placa; Pluma.ir("#/vecino/incidente"); });
})();
