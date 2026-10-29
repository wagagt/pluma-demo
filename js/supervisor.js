/*
 * Supervisor (P09 panel, P09b historial, P10 incidente) y Administrador (P11).
 */
(function () {
  const { esc, icono, placa, quien, estado, vacio, aviso, fichaDestino } = Pluma.UI;
  const S = Pluma.store, R = Pluma.R, T = Pluma.T;

  let hist = { texto: "", estado: "", modalidad: "", dias: 7 };
  Pluma.reiniciarVistas.push(() => { hist = { texto: "", estado: "", modalidad: "", dias: 7 }; });

  function selectorFiltro() {
    const f = S.e.sesion.filtro || "todas";
    const opciones = [`<option value="todas" ${f === "todas" ? "selected" : ""}>Todas las colonias</option>`];
    S.e.colonias.forEach((c) => {
      opciones.push(`<option value="${c.id}" ${f === c.id ? "selected" : ""}>${esc(c.nombre)}</option>`);
      S.e.garitas.filter((g) => g.coloniaId === c.id).forEach((g) =>
        opciones.push(`<option value="${g.id}" ${f === g.id ? "selected" : ""}>&nbsp;&nbsp;&nbsp;${esc(g.nombre)}</option>`));
    });
    return `<label class="filtro"><span>Mostrando</span><select data-entrada="filtro">${opciones.join("")}</select></label>`;
  }
  Pluma.entrada("filtro", (el) => { S.e.sesion.filtro = el.value; S.guardar(); Pluma.render(); });

  function marco(rol, activo, contenido) {
    const nav = rol === "supervisor"
      ? [["panel", "Panel", "#/supervisor"], ["historial", "Historial", "#/supervisor/historial"], ["incidentes", "Incidentes", "#/supervisor/incidentes"]]
      : [["viviendas", "Viviendas", "#/admin"], ["garitas", "Colonias y garitas", "#/admin/garitas"], ["politicas", "Permanencia", "#/admin/politicas"]];
    return `<div class="app app-escritorio">
      <aside class="lateral">
        <a class="app-marca" href="${nav[0][2]}">Pluma</a>
        <p class="lateral-rol">${rol === "supervisor" ? "Supervisión de seguridad" : "Administración"}</p>
        <nav aria-label="Secciones">${nav.map(([id, t, h]) => `<a href="${h}" ${id === activo ? 'aria-current="page"' : ""}>${t}</a>`).join("")}</nav>
      </aside>
      <main class="app-contenido">${contenido}</main>
    </div>`;
  }

  /* ---------- P09 Panel ---------- */

  Pluma.vista(/^#\/supervisor$/, "supervisor", () => {
    const f = S.e.sesion.filtro || "todas";
    const k = R.indicadores(f, 7);
    const max = Math.max(...k.porHora, 1);
    const horas = k.porHora.slice(6, 23);
    const barras = horas.map((n, i) => {
      const h = i + 6, alto = Math.round((n / max) * 100);
      return `<div class="barra" title="${n} ingresos a las ${h}:00"><span style="height:${alto}%"></span><small>${h % 3 === 0 ? h : ""}</small></div>`;
    }).join("");
    const consolidado = f === "todas" ? `<section aria-labelledby="t-garitas"><h2 id="t-garitas">Por garita, últimos 7 días</h2>
      <table class="tabla"><thead><tr><th>Garita</th><th>Colonia</th><th class="n">Ingresos</th><th class="n">Con pase</th><th class="n">Dentro ahora</th></tr></thead>
      <tbody>${R.porGarita(7).map((g) => `<tr><td>${esc(g.garita.nombre)}</td><td>${esc(g.colonia.nombre)}</td>
        <td class="n num">${g.visitas}</td><td class="n num">${g.visitas ? Math.round((g.conPase / g.visitas) * 100) : 0} %</td><td class="n num">${g.dentro}</td></tr>`).join("")}</tbody></table></section>` : "";
    return marco("supervisor", "panel", `
      <header class="cabecera-pagina"><h1>Panel de seguridad</h1>${selectorFiltro()}</header>
      <section class="cifras" aria-label="Cifras clave">
        <div><strong class="num">${k.ocupacion.total}</strong><span>dentro ahora</span><small>${k.ocupacion.vehiculos} vehículos, ${k.ocupacion.peatones} a pie</small></div>
        <div><strong class="num">${k.visitas}</strong><span>ingresos en 7 días</span></div>
        <div><strong class="num">${T.duracion(k.promedio)}</strong><span>permanencia promedio</span></div>
        <div><strong class="num">${k.pctPase} %</strong><span>entraron con pase</span></div>
        <div class="${k.prolongadas.length ? "cifra-pluma" : ""}"><strong class="num">${k.prolongadas.length}</strong><span>visitas de más de ${S.e.umbralHoras} h</span></div>
      </section>
      <div class="panel-rejilla">
        <section aria-labelledby="t-prolongadas" class="panel-prolongadas"><h2 id="t-prolongadas">Visitas prolongadas</h2>
          ${k.prolongadas.length ? `<ul class="lista">${k.prolongadas.map((v) => {
            const viv = R.vivienda(v.viviendaId);
            const inc = v.placa ? R.incidentesDePlaca(v.placa) : [];
            return `<li class="lista-fila">${quien(v, "s")}<span>${esc(viv.numero)}, ${esc(viv.apellidos.split(" ")[0])}<small>${esc(R.colonia(v.coloniaId).nombre)}</small></span>
              <span class="num fuerte" data-desde="${v.entrada}">${T.duracion(R.duracion(v))}</span>
              ${inc.length ? `<a href="#/supervisor/incidente/${inc[0].id}" class="etiqueta-incidente">${inc.length} reporte</a>` : ""}</li>`;
          }).join("")}</ul><p class="tenue">Es un aviso para revisar, no una infracción. Ninguna visita se cierra sola.</p>` : vacio("Ninguna visita supera el límite de permanencia.")}
        </section>
        <section aria-labelledby="t-incidentes" class="panel-incidentes"><h2 id="t-incidentes">Incidentes por revisar</h2>
          ${k.incidentesAbiertos.length ? `<ul class="lista">${k.incidentesAbiertos.map((i) => `<li><a class="lista-fila" href="#/supervisor/incidente/${i.id}">
            <span class="num">${i.folio}</span>${i.placa ? placa(i.placa, "xs") : `<span>${esc(i.rasgos)}</span>`}
            <span>${esc(i.tipo)}<small>${esc(T.fecha(i.fechaHora))}</small></span>${estado(i.estado)}</a></li>`).join("")}</ul>` : vacio("No hay incidentes pendientes.")}
        </section>
        <section aria-labelledby="t-horas" class="panel-horas"><h2 id="t-horas">Ingresos por hora, últimos 7 días</h2>
          <div class="barras" role="img" aria-label="Ingresos por hora del día">${barras}</div></section>
        <section aria-labelledby="t-ranking" class="panel-ranking"><h2 id="t-ranking">Casas con más visitas, 7 días</h2>
          <ol class="ranking">${k.ranking.map((r) => `<li><span>${esc(r.vivienda.numero)}, ${esc(r.vivienda.apellidos.split(" ")[0])}<small>${esc(R.colonia(r.vivienda.coloniaId).nombre)}</small></span><strong class="num">${r.n}</strong></li>`).join("")}</ol>
        </section>
      </div>
      ${consolidado}`);
  });

  /* ---------- P09b Historial ---------- */

  function filasHistorial() {
    const f = S.e.sesion.filtro || "todas";
    const desde = S.ahora() - hist.dias * T.D;
    const q = hist.texto.trim().toLowerCase().replace(/-/g, "");
    const lista = S.e.visitas
      .filter((v) => R.enFiltro(v, f) && v.entrada >= desde && v.entrada <= S.ahora())
      .filter((v) => !hist.estado || v.estado === hist.estado)
      .filter((v) => !hist.modalidad || v.modalidad === hist.modalidad)
      .filter((v) => {
        if (!q) return true;
        const viv = R.vivienda(v.viviendaId);
        return `${R.nombreVisita(v)} ${viv.numero} ${viv.apellidos}`.toLowerCase().replace(/-/g, "").includes(q);
      })
      .sort((a, b) => b.entrada - a.entrada);
    if (!lista.length) return `<tr><td colspan="7">${vacio("Ninguna visita coincide con los filtros.")}</td></tr>`;
    return lista.slice(0, 80).map((v) => {
      const viv = R.vivienda(v.viviendaId);
      return `<tr><td>${quien(v, "xs")}</td><td>${esc(viv.numero)}, ${esc(viv.apellidos.split(" ")[0])}</td>
        <td class="num">${esc(T.fecha(v.entrada))} ${T.hora(v.entrada)}</td><td class="num">${v.salida ? T.hora(v.salida) : "—"}</td>
        <td class="num n">${T.duracion(R.duracion(v))}</td><td>${esc(R.garita(v.garitaEntradaId).nombre)}${v.origen === "PASE" ? ", con pase" : ""}</td>
        <td>${estado(v.estado)}${R.prolongada(v) ? estado("PROLONGADA") : ""}</td></tr>`;
    }).join("") + (lista.length > 80 ? `<tr><td colspan="7" class="tenue">Se muestran 80 de ${lista.length}. Afine los filtros para ver el resto.</td></tr>` : "");
  }

  Pluma.vista(/^#\/supervisor\/historial$/, "supervisor", () => marco("supervisor", "historial", `
    <header class="cabecera-pagina"><h1>Historial de visitas</h1>${selectorFiltro()}</header>
    <div class="filtros">
      <label class="campo buscador">${icono("lupa")}<input type="search" value="${esc(hist.texto)}" data-entrada="hist-texto" placeholder="Placa, nombre, casa o apellido" aria-label="Buscar"></label>
      <label class="campo"><span>Estado</span><select data-entrada="hist-estado"><option value="">Todos</option>
        <option value="DENTRO" ${hist.estado === "DENTRO" ? "selected" : ""}>Dentro</option><option value="FINALIZADA" ${hist.estado === "FINALIZADA" ? "selected" : ""}>Finalizada</option></select></label>
      <label class="campo"><span>Tipo</span><select data-entrada="hist-modalidad"><option value="">Todos</option>
        <option value="VEHICULAR" ${hist.modalidad === "VEHICULAR" ? "selected" : ""}>Vehículo</option><option value="PEATONAL" ${hist.modalidad === "PEATONAL" ? "selected" : ""}>A pie</option></select></label>
      <label class="campo"><span>Periodo</span><select data-entrada="hist-dias">
        ${[1, 3, 7, 30].map((d) => `<option value="${d}" ${hist.dias === d ? "selected" : ""}>${d === 1 ? "Último día" : `Últimos ${d} días`}</option>`).join("")}</select></label>
    </div>
    <div class="tabla-marco"><table class="tabla"><thead><tr><th>Visita</th><th>Casa</th><th>Entrada</th><th>Salida</th><th class="n">Duración</th><th>Garita</th><th>Estado</th></tr></thead>
      <tbody id="hist-filas">${filasHistorial()}</tbody></table></div>`));

  const refrescarHist = () => { document.getElementById("hist-filas").innerHTML = filasHistorial(); };
  Pluma.entrada("hist-texto", (el) => { hist.texto = el.value; refrescarHist(); });
  Pluma.entrada("hist-estado", (el) => { hist.estado = el.value; refrescarHist(); });
  Pluma.entrada("hist-modalidad", (el) => { hist.modalidad = el.value; refrescarHist(); });
  Pluma.entrada("hist-dias", (el) => { hist.dias = Number(el.value); refrescarHist(); });

  /* ---------- Incidentes: lista y P10 detalle ---------- */

  Pluma.vista(/^#\/supervisor\/incidentes$/, "supervisor", () => {
    const col = R.coloniaDeFiltro(S.e.sesion.filtro);
    const lista = S.e.incidentes.filter((i) => !col || i.coloniaId === col);
    return marco("supervisor", "incidentes", `
      <header class="cabecera-pagina"><h1>Incidentes</h1>${selectorFiltro()}</header>
      ${lista.length ? `<ul class="lista lista-incidentes">${lista.map((i) => `<li><a class="lista-fila" href="#/supervisor/incidente/${i.id}">
        <span class="num">${i.folio}</span>${i.placa ? placa(i.placa, "xs") : `<span>${esc(i.rasgos)}</span>`}
        <span>${esc(i.tipo)}<small>${esc(i.lugar)}, ${esc(T.fecha(i.fechaHora))}</small></span>${estado(i.estado)}</a></li>`).join("")}</ul>`
        : vacio("No hay incidentes en esta colonia.")}`);
  });

  Pluma.vista(/^#\/supervisor\/incidente\/(I\d+)$/, "supervisor", (id) => {
    const inc = R.incidente(id);
    if (!inc) return marco("supervisor", "incidentes", vacio("Ese incidente no existe."));
    const sug = inc.visitaSugeridaId ? R.visita(inc.visitaSugeridaId) : null;
    const asoc = inc.visitaAsociadaId ? R.visita(inc.visitaAsociadaId) : null;
    const tarjetaVisita = (v) => {
      const viv = R.vivienda(v.viviendaId);
      return `<div class="visita-ref">${quien(v, "m")}<div>
        <p>Visitó ${esc(viv.numero)}, familia ${esc(viv.apellidos)}</p>
        <p class="num tenue">Entró ${esc(T.fecha(v.entrada))} ${T.hora(v.entrada)} por ${esc(R.garita(v.garitaEntradaId).nombre)}${v.salida ? `, salió ${esc(T.fecha(v.salida))} ${T.hora(v.salida)}` : ", sigue dentro"}</p>
        ${fichaDestino(viv, true)}</div></div>`;
    };
    const cerrado = inc.estado === "RESUELTO" || inc.estado === "DESCARTADO";
    return marco("supervisor", "incidentes", `
      <p><a class="btn-texto" href="#/supervisor/incidentes">Todos los incidentes</a></p>
      <header class="cabecera-pagina"><h1>${esc(inc.tipo)} <span class="num tenue">${inc.folio}</span></h1>${estado(inc.estado)}</header>
      <div class="incidente">
        <section class="incidente-relato">
          <dl class="datos">
            <div><dt>Placa</dt><dd>${inc.placa ? placa(inc.placa, "m") : "No la vio"}</dd></div>
            ${inc.rasgos ? `<div><dt>Descripción</dt><dd>${esc(inc.rasgos)}</dd></div>` : ""}
            <div><dt>Cuándo</dt><dd class="num">${esc(T.fechaLarga(inc.fechaHora))}, ${T.hora(inc.fechaHora)}</dd></div>
            <div><dt>Dónde</dt><dd>${esc(inc.lugar)}</dd></div>
            <div><dt>Reportó</dt><dd>${esc(R.vivienda(inc.reportadoPor).numero)} <small class="tenue">(no se comparte con la persona reportada)</small></dd></div>
          </dl>
          <blockquote>${esc(inc.relato)}</blockquote>
          ${inc.evidencia ? `<div class="evidencia-foto" role="img" aria-label="Foto adjunta simulada">${icono("camara")}<span>Foto adjunta por el vecino</span></div>` : ""}
          ${inc.notas.length ? `<h2>Notas de revisión</h2><ul class="notas">${inc.notas.map((n) => `<li><span class="num tenue">${esc(T.fecha(n.fechaHora))} ${T.hora(n.fechaHora)}</span> ${esc(n.texto)}</li>`).join("")}</ul>` : ""}
        </section>
        <section class="incidente-revision">
          <h2>Coincidencia con accesos</h2>
          ${asoc ? `<p class="tenue">Asociada a esta visita:</p>${tarjetaVisita(asoc)}`
            : sug ? `<p>La garita registró este vehículo en ese horario. Verifique antes de asociar.</p>${tarjetaVisita(sug)}
              ${cerrado ? "" : `<div class="fila-botones"><button type="button" class="btn btn-principal" data-accion="inc-asociar" data-id="${inc.id}">Asociar a esta visita</button>
                <button type="button" class="btn" data-accion="inc-no-coincide" data-id="${inc.id}">No coincide</button></div>`}`
            : `<p class="tenue">No hay una visita registrada que coincida con esa placa y ese horario.</p>`}
          ${cerrado ? "" : `<form class="formulario" data-form="inc-nota" data-id="${inc.id}">
            <label class="campo"><span>Nota de revisión</span><textarea name="nota" rows="2" placeholder="Qué se verificó o qué se hizo"></textarea></label>
            <div class="fila-botones">
              ${inc.estado === "ABIERTO" ? `<button type="submit" name="estado" value="EN REVISIÓN" class="btn">Pasar a revisión</button>` : ""}
              <button type="submit" name="estado" value="RESUELTO" class="btn btn-principal">Marcar resuelto</button>
              <button type="submit" name="estado" value="DESCARTADO" class="btn btn-quieto">Descartar</button>
            </div></form>`}
        </section>
      </div>`);
  });

  Pluma.accion("inc-asociar", (el) => {
    const inc = R.incidente(el.dataset.id);
    R.actualizarIncidente(inc.id, { visitaAsociadaId: inc.visitaSugeridaId, estado: "EN REVISIÓN" }, "Asociado a la visita registrada en garita.");
    Pluma.render();
    aviso(`${inc.folio} asociado a la visita`, "paso");
  });
  Pluma.accion("inc-no-coincide", (el) => {
    const inc = R.incidente(el.dataset.id);
    R.actualizarIncidente(inc.id, { visitaSugeridaId: null }, "La coincidencia sugerida no corresponde.");
    Pluma.render();
  });
  Pluma.formulario("inc-nota", (f, d, ev) => {
    const nuevo = ev.submitter ? ev.submitter.value : "EN REVISIÓN";
    const inc = R.actualizarIncidente(f.dataset.id, { estado: nuevo }, d.nota.trim() || null);
    Pluma.render();
    aviso(`${inc.folio}: ${nuevo === "EN REVISIÓN" ? "en revisión" : nuevo === "RESUELTO" ? "resuelto" : "descartado"}`, "paso");
  });

  /* ---------- P11 Administración ---------- */

  let edicion = null;
  Pluma.reiniciarVistas.push(() => { edicion = null; });

  Pluma.vista(/^#\/admin$/, "admin", () => {
    const col = R.coloniaDeFiltro(S.e.sesion.filtro) || "cip";
    const lista = S.e.viviendas.filter((v) => v.coloniaId === col);
    const selector = `<label class="filtro"><span>Colonia</span><select data-entrada="admin-colonia">${S.e.colonias.map((c) => `<option value="${c.id}" ${c.id === col ? "selected" : ""}>${esc(c.nombre)}</option>`).join("")}</select></label>`;
    return marco("admin", "viviendas", `
      <header class="cabecera-pagina"><h1>Viviendas</h1>${selector}</header>
      <p class="tenue">Estos datos son los que ve el guardia al registrar una visita: apellidos, dirección y teléfono de contacto.</p>
      <div class="tabla-marco"><table class="tabla"><thead><tr><th>Casa</th><th>Familia</th><th>Dirección</th><th>Teléfono de contacto</th><th>Estado</th><th></th></tr></thead>
      <tbody>${lista.map((v) => edicion === v.id ? `<tr class="editando"><td>${esc(v.numero)}</td>
          <td><input form="f-viv" name="apellidos" value="${esc(v.apellidos)}" aria-label="Apellidos"></td>
          <td>${esc(v.direccion)}</td>
          <td><input form="f-viv" name="telefono" value="${esc(v.telefonoContacto)}" class="num" aria-label="Teléfono"></td>
          <td><label class="casilla"><input form="f-viv" type="checkbox" name="activa" ${v.activa ? "checked" : ""}> Activa</label></td>
          <td><form id="f-viv" data-form="admin-vivienda" data-id="${v.id}"><button type="submit" class="btn btn-principal btn-s">Guardar cambios</button></form></td></tr>`
        : `<tr><td>${esc(v.numero)}</td><td>${esc(v.apellidos)}</td><td>${esc(v.direccion)}</td><td class="num">${esc(v.telefonoContacto)}</td>
          <td>${v.activa ? estado("DENTRO").replace("Dentro", "Activa") : estado("FINALIZADA").replace("Finalizada", "Inactiva")}</td>
          <td><button type="button" class="btn-texto" data-accion="admin-editar" data-id="${v.id}">Editar</button></td></tr>`).join("")}</tbody></table></div>`);
  });
  Pluma.entrada("admin-colonia", (el) => { S.e.sesion.filtro = el.value; edicion = null; S.guardar(); Pluma.render(); });
  Pluma.accion("admin-editar", (el) => { edicion = el.dataset.id; Pluma.render(); });
  Pluma.formulario("admin-vivienda", (f, d) => {
    const v = R.vivienda(f.dataset.id);
    v.apellidos = d.apellidos.trim() || v.apellidos;
    v.telefonoContacto = d.telefono.trim() || v.telefonoContacto;
    v.activa = d.activa === "on";
    edicion = null;
    S.auditar("administrador", "editó vivienda", v.id);
    S.guardar();
    Pluma.render();
    aviso(`Cambios guardados en ${v.numero}`, "paso");
  });

  Pluma.vista(/^#\/admin\/garitas$/, "admin", () => marco("admin", "garitas", `
    <header class="cabecera-pagina"><h1>Colonias y garitas</h1></header>
    ${S.e.colonias.map((c) => `<section class="colonia-bloque"><h2>${esc(c.nombre)}</h2>
      <p class="tenue">${S.e.viviendas.filter((v) => v.coloniaId === c.id).length} viviendas</p>
      <ul class="lista">${S.e.garitas.filter((g) => g.coloniaId === c.id).map((g) => `<li class="lista-fila"><strong>${esc(g.nombre)}</strong>
        <span>Turno actual: ${esc(g.guardia)}</span><span class="num">${R.dentro(g.id).length} dentro por esta garita</span></li>`).join("")}</ul></section>`).join("")}
    <form class="formulario formulario-linea" data-form="admin-garita">
      <label class="campo"><span>Nueva garita</span><input name="nombre" required placeholder="Garita Oriente"></label>
      <label class="campo"><span>Colonia</span><select name="colonia">${S.e.colonias.map((c) => `<option value="${c.id}">${esc(c.nombre)}</option>`).join("")}</select></label>
      <button type="submit" class="btn">Agregar garita</button>
    </form>`));
  Pluma.formulario("admin-garita", (f, d) => {
    const id = `${d.colonia}-${Date.now().toString(36)}`;
    S.e.garitas.push({ id, coloniaId: d.colonia, nombre: d.nombre.trim(), guardia: "Sin asignar" });
    S.guardar();
    Pluma.render();
    aviso(`${d.nombre.trim()} agregada`, "paso");
  });

  Pluma.vista(/^#\/admin\/politicas$/, "admin", () => {
    const prol = R.dentro("todas").filter(R.prolongada).length;
    return marco("admin", "politicas", `
      <header class="cabecera-pagina"><h1>Permanencia</h1></header>
      <form class="formulario" data-form="admin-umbral">
        <label class="campo campo-corto"><span>Avisar cuando una visita lleve más de</span>
          <span class="campo-unidad"><input type="number" name="horas" min="1" max="240" value="${S.e.umbralHoras}" class="num"> horas</span></label>
        <p class="campo-ayuda">Con el límite actual hay ${prol} ${prol === 1 ? "visita prolongada" : "visitas prolongadas"}. El aviso no cierra la visita ni sanciona: solo pide revisión.</p>
        <button type="submit" class="btn btn-principal">Guardar límite</button>
      </form>`);
  });
  Pluma.formulario("admin-umbral", (f, d) => {
    S.e.umbralHoras = Math.max(1, Number(d.horas) || 24);
    S.auditar("administrador", "cambió umbral de permanencia", `${S.e.umbralHoras} h`);
    S.guardar();
    Pluma.render();
    aviso(`Límite guardado: ${S.e.umbralHoras} h`, "paso");
  });
})();
