/*
 * Datos ficticios de la demo. Todas las horas son relativas al momento de
 * restablecer (`ahora`), para que los escenarios se vean igual cada vez:
 * P-789GHI siempre lleva ~76 h dentro (E5), P-123ABC espera en el carril (E1), etc.
 * Nombres, placas, teléfonos e identificaciones son inventados.
 */
window.Pluma = window.Pluma || {};

Pluma.crearSeed = function (ahora) {
  const MIN = 60e3, H = 60 * MIN, D = 24 * H;

  // PRNG determinista: el mismo seed produce siempre el mismo historial.
  let s = 20261028;
  const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
  const elegir = (arr) => arr[Math.floor(rnd() * arr.length)];

  const colonias = [
    { id: "cip", nombre: "Residenciales Los Cipreses" },
    { id: "lag", nombre: "Colonia Vista del Lago" },
  ];
  const garitas = [
    { id: "cip-n", coloniaId: "cip", nombre: "Garita Norte", guardia: "Rolando Ajú" },
    { id: "cip-s", coloniaId: "cip", nombre: "Garita Sur", guardia: "Marta Tzul" },
    { id: "lag-p", coloniaId: "lag", nombre: "Garita Principal", guardia: "Edwin Coy" },
  ];

  const apellidosCip = [
    "Hernández Cruz", "Rodas Méndez", "Samayoa Gil", "Barrios Lima", "Figueroa Paz", "Velásquez Ruiz",
    "Morales Ixcot", "Pineda Solís", "Cifuentes Mejía", "Arriola Toledo", "Monzón Reyes", "Girón Castañeda",
    "Estrada Polanco", "Juárez Bran", "Aguilar Sosa", "Quiñónez Ávila", "Recinos Mazariegos", "López Sandoval",
    "Ramírez Orellana", "Dávila Chacón", "Escobar Leiva", "Muñoz Valdez", "Herrera Contreras", "Ortiz Batres",
  ];
  const apellidosLag = [
    "Calderón Prado", "Villatoro Ruano", "Maldonado Coronado", "Archila Fuentes", "Pérez Grajeda",
    "Solórzano Gálvez", "Asturias Monroy", "Castillo Arévalo", "Najarro Tejada", "Urrutia Molina",
  ];

  const viviendas = [];
  apellidosCip.forEach((ap, i) => {
    const n = i + 1;
    const sector = n <= 12 ? "A" : "B";
    viviendas.push({
      id: `cip-${n}`, coloniaId: "cip", sector, numero: `Casa ${n}`,
      direccion: `Sector ${sector}, Casa ${n}`, apellidos: ap,
      telefonoContacto: `5550-${String(100 + n).padStart(4, "0")}`,
      residentes: [`Residente ${ap.split(" ")[0]} 1`, `Residente ${ap.split(" ")[0]} 2`],
      activa: true,
    });
  });
  apellidosLag.forEach((ap, i) => {
    const n = i + 1;
    viviendas.push({
      id: `lag-${n}`, coloniaId: "lag", sector: "Muelle", numero: `Lote ${n}`,
      direccion: `Calle del Muelle, Lote ${n}`, apellidos: ap,
      telefonoContacto: `5551-${String(200 + n).padStart(4, "0")}`,
      residentes: [`Residente ${ap.split(" ")[0]} 1`],
      activa: true,
    });
  });

  const vehiculos = {
    "P-123ABC": { marca: "Toyota", modelo: "Corolla", color: "gris" },
    "P-456DEF": { marca: "Mazda", modelo: "CX-5", color: "rojo" },
    "P-789GHI": { marca: "Nissan", modelo: "Frontier", color: "blanco" },
    "P-321KLM": { marca: "Honda", modelo: "Civic", color: "negro" },
    "P-246TUV": { marca: "Kia", modelo: "Picanto", color: "azul" },
    "P-246TUW": { marca: "Kia", modelo: "Picanto", color: "azul" },
  };
  const placasExtra = [
    "P-102BCD", "P-215FGH", "P-338JKL", "P-447MNP", "P-551QRS", "P-664TVW", "P-773XYZ", "P-881BDF",
    "P-905GHJ", "P-118KMN", "P-229PQR", "P-342STV", "P-456WXY", "P-567BCF", "P-678DGH", "P-789JKN",
    "M-123ABD", "M-456CDE", "P-890LMP", "P-901RST",
  ];
  const modelos = [
    ["Toyota", "Hilux", "blanco"], ["Hyundai", "Tucson", "gris"], ["Suzuki", "Swift", "rojo"],
    ["Mitsubishi", "L200", "plateado"], ["Chevrolet", "Spark", "verde"], ["Toyota", "Yaris", "azul"],
    ["Isuzu", "D-Max", "negro"], ["Honda", "CR-V", "blanco"],
  ];
  placasExtra.forEach((p) => {
    const [marca, modelo, color] = elegir(modelos);
    vehiculos[p] = p.startsWith("M-") ? { marca: "Yamaha", modelo: "moto", color } : { marca, modelo, color };
  });

  const nombres = ["Ana", "Luis", "Sofía", "Carlos", "María José", "Diego", "Lucía", "Andrés", "Gabriela", "Pablo", "Daniela", "Fernando"];
  const apellidosVis = ["Pérez", "García", "Méndez", "Castillo", "Rosales", "Toledo", "Salazar", "Paredes", "Alvarado", "Cabrera"];
  const visitantes = [
    { id: "vis-ana", nombre: "Ana Pérez", identificacion: "3041 77201 0101" },
    { id: "vis-jorge", nombre: "Jorge Castillo", identificacion: "2876 45120 0108" },
    { id: "vis-karla", nombre: "Karla Rosales", identificacion: "1998 30455 0115" },
  ];
  for (let i = 0; i < 24; i++) {
    visitantes.push({
      id: `vis-${i}`,
      nombre: `${elegir(nombres)} ${elegir(apellidosVis)}`,
      identificacion: `${1000 + Math.floor(rnd() * 8999)} ${10000 + Math.floor(rnd() * 89999)} 01${String(Math.floor(rnd() * 99)).padStart(2, "0")}`,
    });
  }

  let seq = 1;
  const visitas = [];
  const nuevaVisita = (v) => { const visita = { id: `V${String(seq++).padStart(4, "0")}`, observaciones: "", ...v }; visitas.push(visita); return visita; };

  // Historial de 7 días (finalizadas), para el panel del supervisor.
  const horaPonderada = () => {
    const picos = [7, 8, 8, 9, 10, 11, 12, 12, 13, 14, 15, 16, 17, 17, 18, 18, 19, 19, 20, 21];
    return elegir(picos) + rnd();
  };
  const inicioDia = (t) => {
    const d = new Date(t);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };
  for (let dia = 7; dia >= 0; dia--) {
    garitas.forEach((g) => {
      const casas = viviendas.filter((v) => v.coloniaId === g.coloniaId);
      const total = g.coloniaId === "cip" ? (g.id === "cip-n" ? 14 : 8) + Math.floor(rnd() * 6) : 7 + Math.floor(rnd() * 5);
      for (let k = 0; k < total; k++) {
        const entrada = inicioDia(ahora - dia * D) + horaPonderada() * H;
        const dur = (20 + rnd() * 260) * MIN;
        if (entrada + dur >= ahora - 30 * MIN) continue;
        // Las casas con más visitas en el ranking: unas pocas concentran tráfico.
        const casa = rnd() < 0.3 ? casas[[17, 5, 9][Math.floor(rnd() * 3)] % casas.length] : elegir(casas);
        const peatonal = rnd() < 0.15;
        nuevaVisita({
          coloniaId: g.coloniaId, viviendaId: casa.id,
          modalidad: peatonal ? "PEATONAL" : "VEHICULAR",
          placa: peatonal ? null : elegir(placasExtra),
          visitanteId: peatonal || rnd() < 0.3 ? elegir(visitantes).id : null,
          estado: "FINALIZADA", entrada, salida: entrada + dur,
          garitaEntradaId: g.id, garitaSalidaId: g.id, guardia: g.guardia,
          origen: rnd() < 0.22 ? "PASE" : "MANUAL",
        });
      }
    });
  }

  // Visitas dentro ahora.
  const dentro = [
    ["cip-n", "cip-24", "P-789GHI", null, 76 * H + 12 * MIN],   // E5 / E6
    ["cip-n", "cip-6", "P-102BCD", null, 3 * H + 40 * MIN],
    ["cip-n", "cip-10", "P-338JKL", null, 2 * H + 5 * MIN],
    ["cip-s", "cip-14", "P-447MNP", null, 1 * H + 20 * MIN],
    ["cip-n", "cip-3", "P-551QRS", null, 55 * MIN],
    ["cip-s", "cip-21", "M-123ABD", null, 40 * MIN],
    ["cip-n", "cip-12", "P-664TVW", null, 25 * MIN],
    ["cip-s", "cip-16", "P-773XYZ", null, 4 * H + 10 * MIN],
    ["cip-n", "cip-9", null, "vis-karla", 1 * H + 15 * MIN],
    ["cip-s", "cip-2", null, "vis-3", 35 * MIN],
    ["cip-n", "cip-19", "P-881BDF", null, 27 * H + 30 * MIN],   // prolongada, por encima del umbral
    ["lag-p", "lag-2", "P-905GHJ", null, 2 * H + 45 * MIN],
    ["lag-p", "lag-5", "P-118KMN", null, 50 * MIN],
    ["lag-p", "lag-7", null, "vis-5", 1 * H + 5 * MIN],
    ["lag-p", "lag-9", "P-229PQR", null, 31 * H],               // prolongada
  ];
  dentro.forEach(([gid, vid, placa, visitanteId, hace]) => {
    const g = garitas.find((x) => x.id === gid);
    nuevaVisita({
      coloniaId: g.coloniaId, viviendaId: vid,
      modalidad: placa ? "VEHICULAR" : "PEATONAL", placa, visitanteId,
      estado: "DENTRO", entrada: ahora - hace, salida: null,
      garitaEntradaId: gid, garitaSalidaId: null, guardia: g.guardia, origen: "MANUAL",
    });
  });

  const hoy = ahora;
  const pases = [
    // E10: pase de hoy para P-246TUV; el visitante llega en P-246TUW.
    { id: "Q001", codigo: "PL-8K4W2R", coloniaId: "cip", viviendaId: "cip-18", fecha: hoy, modalidad: "VEHICULAR",
      visitanteId: "vis-jorge", placa: "P-246TUV", estado: "EMITIDO", creado: ahora - 5 * H },
    // Pase ya utilizado ayer: sirve para mostrar E4 aunque no se haya hecho E3.
    { id: "Q002", codigo: "PL-3M7Q9T", coloniaId: "cip", viviendaId: "cip-18", fecha: ahora - D, modalidad: "VEHICULAR",
      visitanteId: "vis-1", placa: "P-215FGH", estado: "UTILIZADO", usadoEn: ahora - D + 2 * H, creado: ahora - 2 * D },
    // Pase peatonal de hoy, otra casa.
    { id: "Q003", codigo: "PL-5T2N8D", coloniaId: "cip", viviendaId: "cip-7", fecha: hoy, modalidad: "PEATONAL",
      visitanteId: "vis-6", placa: null, estado: "EMITIDO", creado: ahora - 3 * H },
  ];

  const incidentes = [
    { id: "I001", folio: "INC-0001", coloniaId: "cip", placa: "P-321KLM", rasgos: "", tipo: "Ruido",
      lugar: "Sector A, frente a Casa 4", fechaHora: ahora - 3 * D - 2 * H,
      relato: "Música a alto volumen desde el vehículo después de las 22:00.",
      evidencia: false, estado: "ABIERTO", visitaSugeridaId: null, visitaAsociadaId: null, notas: [], reportadoPor: "cip-5" },
    { id: "I002", folio: "INC-0002", coloniaId: "lag", placa: "P-890LMP", rasgos: "", tipo: "Estacionamiento indebido",
      lugar: "Calle del Muelle, frente a Lote 3", fechaHora: ahora - 5 * D,
      relato: "Vehículo estacionado bloqueando la entrada del garaje toda la tarde.",
      evidencia: true, estado: "RESUELTO", visitaSugeridaId: null, visitaAsociadaId: null,
      notas: [{ fechaHora: ahora - 4 * D, texto: "Se habló con el residente que recibió la visita. Cerrado." }], reportadoPor: "lag-3" },
  ];

  // Quién espera en cada garita: lo que la cámara «ve» al tocar la llegada.
  const carril = [
    { id: "L1", garitaId: "cip-n", tipo: "VEHICULAR", placa: "P-123ABC", lecturaOCR: "P-123A8C", destinoSugerido: "López" }, // E1 + E8
    { id: "L2", garitaId: "cip-n", tipo: "VEHICULAR", placa: "P-321KLM", lecturaOCR: "P-321KLM", destinoSugerido: "Pineda" }, // RF-11
    { id: "L3", garitaId: "cip-n", tipo: "PEATONAL", visitanteId: "vis-ana", destinoSugerido: "Morales" },                    // E9
    { id: "L4", garitaId: "cip-n", tipo: "PASE", placa: "P-246TUW", codigo: "PL-8K4W2R" },                                   // E10
    { id: "L5", garitaId: "cip-s", tipo: "VEHICULAR", placa: "P-567BCF", lecturaOCR: "P-567BCF", destinoSugerido: "Herrera" },
    { id: "L6", garitaId: "lag-p", tipo: "VEHICULAR", placa: "P-678DGH", lecturaOCR: "P-678D6H", destinoSugerido: "Calderón" },
  ];

  return {
    version: 1,
    creado: ahora,
    offset: 0,
    umbralHoras: 24,
    sesion: { rol: null, coloniaId: "cip", garitaId: "cip-n", filtro: "cip" },
    colonias, garitas, viviendas, vehiculos, visitantes, visitas, pases, incidentes, carril,
    auditoria: [],
    seq: { visita: seq, pase: 4, incidente: 3, llegada: 7 },
  };
};
