"use strict";

/*
 * app.js
 * Interfaz: crea los nodos del DOM, registra los eventos y llama a las
 * funciones de logica.js. Aquí sí se lee y se modifica el DOM.
 */

// ---------- Datos iniciales ----------
const datosProductos = [
  { id: 101, nombre: "Ratón USB", categoria: "perifericos", precio: 12.5, stock: 8 },
  { id: 102, nombre: "Teclado", categoria: "perifericos", precio: 24.9, stock: 0 },
  { id: 103, nombre: "Monitor 24 pulgadas", categoria: "perifericos", precio: 139, stock: 4 },
  { id: 104, nombre: "Disco SSD 1 TB", categoria: "almacenamiento", precio: 79.95, stock: 5 },
  { id: 105, nombre: "Memoria USB 64 GB", categoria: "almacenamiento", precio: 9.9, stock: 20 },
  { id: 106, nombre: "Paquete de folios A4", categoria: "oficina", precio: 4.75, stock: 30 },
  { id: 107, nombre: "Silla de oficina", categoria: "oficina", precio: 115, stock: 2 },
  { id: 108, nombre: "Grapadora", categoria: "oficina", precio: 6.2, stock: 12 }
];

// Las tres colecciones en memoria
const catalogo = crearCatalogo(datosProductos);
const carrito = [];
const pedidos = [];
let siguienteNumeroPedido = 1;

// Texto que se muestra para cada categoría y modalidad (acceso con corchetes)
const ETIQUETAS_CATEGORIA = {
  perifericos: "Periféricos",
  almacenamiento: "Almacenamiento",
  oficina: "Oficina"
};
const ETIQUETAS_MODALIDAD = {
  recogida: "Recogida",
  envio: "Envío"
};

// Campos del formulario que se validan
const CAMPOS_FORMULARIO = ["nombre", "email", "entrega", "direccion", "cp", "observaciones", "acepto"];


// ---------- Referencias al DOM ----------
const buscador = document.getElementById("buscar");
const filtroCategoria = document.getElementById("filtro-categoria");
const listaProductos = document.getElementById("lista-productos");
const catalogoVacio = document.getElementById("catalogo-vacio");

const tablaCarrito = document.getElementById("tabla-carrito");
const lineasCarrito = document.getElementById("lineas-carrito");
const carritoVacio = document.getElementById("carrito-vacio");
const totalUnidades = document.getElementById("total-unidades");
const totalSubtotal = document.getElementById("total-subtotal");
const totalDescuento = document.getElementById("total-descuento");
const totalFinal = document.getElementById("total-final");

const formulario = document.getElementById("form-pedido");
const campos = formulario.elements;
const datosEnvio = document.getElementById("datos-envio");
const contadorObservaciones = document.getElementById("contador-observaciones");
const botonConfirmar = document.getElementById("boton-confirmar");
const mensajePedido = document.getElementById("mensaje-pedido");

const filtroHistorial = document.getElementById("filtro-historial");
const resumenHistorial = document.getElementById("resumen-historial");
const historialVacio = document.getElementById("historial-vacio");
const listaPedidos = document.getElementById("lista-pedidos");
const botonExportar = document.getElementById("boton-exportar");
const jsonExportado = document.getElementById("json-exportado");


// ---------- Utilidades de presentación ----------

function formatearFecha(textoIso) {
  return new Date(textoIso).toLocaleString("es-ES");
}

/** Crea un elemento con un texto (siempre con textContent, nunca innerHTML). */
function crearElemento(etiqueta, texto = "", clase = "") {
  const elemento = document.createElement(etiqueta);
  elemento.textContent = texto;
  if (clase !== "") elemento.className = clase;
  return elemento;
}

function mostrarMensajePedido(texto, tipo) {
  mensajePedido.textContent = texto;
  mensajePedido.className = "mensaje " + tipo;
}


// ---------- Catálogo ----------

/** Crea la tarjeta de un producto con nombre, categoría, precio, stock y cantidad. */
function crearTarjetaProducto(producto) {
  const tarjeta = document.createElement("article");
  tarjeta.className = "tarjeta";

  const titulo = crearElemento("h3", producto.nombre);
  const categoria = crearElemento("p", "Categoría: " + ETIQUETAS_CATEGORIA[producto.categoria]);
  const precio = crearElemento("p", "Precio: " + formatearPrecio(producto.precio));

  const existencias = producto.hayStock()
    ? crearElemento("p", "Existencias: " + producto.stock)
    : crearElemento("p", "Sin existencias", "agotado");

  const idCampo = "cantidad-" + producto.id;
  const etiqueta = crearElemento("label", "Cantidad ");
  etiqueta.htmlFor = idCampo;

  const entrada = document.createElement("input");
  entrada.type = "number";
  entrada.id = idCampo;
  entrada.name = "cantidad";
  entrada.min = "1";
  entrada.max = String(producto.stock);
  entrada.step = "1";
  entrada.required = true;
  entrada.value = "1";

  const aviso = crearElemento("p", "", "aviso");
  aviso.id = "aviso-" + producto.id;
  aviso.setAttribute("aria-live", "polite");
  entrada.setAttribute("aria-describedby", aviso.id);

  const boton = crearElemento("button", "Añadir al carrito", "btn-anadir");
  boton.type = "button";
  boton.dataset.id = String(producto.id);

  // Los productos sin stock se muestran, pero no se pueden añadir
  if (!producto.hayStock()) {
    entrada.disabled = true;
    entrada.value = "";
    boton.disabled = true;
  }

  tarjeta.append(titulo, categoria, precio, existencias, etiqueta, entrada, boton, aviso);
  return tarjeta;
}

function mostrarCatalogo() {
  // No confiamos en el valor del select: comprobamos que sea una opción admitida
  let categoria = filtroCategoria.value;
  if (categoria !== "todas" && !CATEGORIAS.includes(categoria)) {
    categoria = "todas";
    filtroCategoria.value = "todas";
  }

  const visibles = filtrarCatalogo(catalogo, buscador.value, categoria);

  listaProductos.replaceChildren();
  visibles.forEach(producto => {
    listaProductos.append(crearTarjetaProducto(producto));
  });
  catalogoVacio.hidden = visibles.length !== 0;
}

/**
 * Lee la cantidad de un input numérico. Devuelve NaN si está vacío para no
 * interpretar una entrada vacía como cero.
 */
function leerCantidad(entrada) {
  if (entrada.value.trim() === "") return NaN;
  return entrada.valueAsNumber;
}

/** Gestiona el clic en "Añadir al carrito" (delegación desde la lista). */
function gestionarAnadir(event) {
  const boton = event.target;
  if (!boton.classList.contains("btn-anadir")) return;

  const tarjeta = boton.parentElement;
  const entrada = tarjeta.querySelector("input[name='cantidad']");
  const aviso = tarjeta.querySelector(".aviso");
  const productoId = Number(boton.dataset.id);
  const cantidad = leerCantidad(entrada);

  let resultado;
  if (Number.isNaN(cantidad)) {
    resultado = { ok: false, mensaje: "Escribe una cantidad." };
  } else {
    resultado = agregarAlCarrito(carrito, catalogo, productoId, cantidad);
  }

  aviso.textContent = resultado.mensaje;
  if (resultado.ok) {
    aviso.className = "aviso ok";
    entrada.setCustomValidity("");
    entrada.value = "1";
    mostrarCarrito();
  } else {
    aviso.className = "aviso error";
    entrada.setCustomValidity(resultado.mensaje);
    entrada.reportValidity();
  }
}

/** Al editar una cantidad se borra el error personalizado de ese campo. */
function limpiarAvisoCantidad(event) {
  const entrada = event.target;
  if (entrada.name !== "cantidad") return;
  entrada.setCustomValidity("");
  const aviso = entrada.parentElement.querySelector(".aviso");
  aviso.textContent = "";
  aviso.className = "aviso";
}


// ---------- Carrito ----------

function crearFilaCarrito(linea) {
  const fila = document.createElement("tr");

  const boton = crearElemento("button", "Retirar", "btn-retirar");
  boton.type = "button";
  boton.dataset.id = String(linea.productoId);
  boton.setAttribute("aria-label", "Retirar " + linea.nombre + " del carrito");
  const celdaBoton = document.createElement("td");
  celdaBoton.append(boton);

  fila.append(
    crearElemento("td", linea.nombre),
    crearElemento("td", String(linea.cantidad)),
    crearElemento("td", formatearPrecio(linea.precio)),
    crearElemento("td", formatearPrecio(linea.importe)),
    celdaBoton
  );
  return fila;
}

function mostrarCarrito() {
  const lineas = crearLineasDetalle(carrito, catalogo);
  lineasCarrito.replaceChildren();
  lineas.forEach(linea => {
    lineasCarrito.append(crearFilaCarrito(linea));
  });

  const vacio = carrito.length === 0;
  carritoVacio.hidden = !vacio;
  tablaCarrito.hidden = vacio;
  botonConfirmar.disabled = vacio;   // no se puede confirmar con el carrito vacío

  let resumen = calcularResumenCarrito(carrito, catalogo);
  if (resumen === null) {
    resumen = { unidades: 0, subtotal: 0, descuento: 0, total: 0 };
  }
  totalUnidades.textContent = String(resumen.unidades);
  totalSubtotal.textContent = formatearPrecio(resumen.subtotal);
  totalDescuento.textContent = formatearPrecio(resumen.descuento);
  totalFinal.textContent = formatearPrecio(resumen.total);
}

/** Clic en "Retirar" (delegación desde el tbody común). */
function gestionarRetirar(event) {
  const boton = event.target;
  if (!boton.classList.contains("btn-retirar")) return;
  retirarDelCarrito(carrito, Number(boton.dataset.id));
  mostrarCarrito();
}


// ---------- Formulario ----------

function leerTexto(formData, nombre) {
  const valor = formData.get(nombre);
  return valor === null ? "" : String(valor);
}

/** Reúne los datos del formulario con FormData. */
function obtenerDatosFormulario() {
  const formData = new FormData(formulario);
  return {
    nombre: leerTexto(formData, "nombre"),
    email: leerTexto(formData, "email"),
    entrega: leerTexto(formData, "entrega"),
    direccion: leerTexto(formData, "direccion"),
    cp: leerTexto(formData, "cp"),
    observaciones: leerTexto(formData, "observaciones"),
    acepto: campos.acepto.checked
  };
}

/** Control sobre el que se fija el error (para los radios, el primero). */
function obtenerControl(nombreCampo) {
  if (nombreCampo === "entrega") {
    return formulario.querySelector("input[name='entrega']");
  }
  return campos[nombreCampo];
}

/** Muestra (o borra, con "") el error de un campo y lo registra en la Constraint Validation API. */
function aplicarError(nombreCampo, mensaje) {
  obtenerControl(nombreCampo).setCustomValidity(mensaje);
  document.getElementById("error-" + nombreCampo).textContent = mensaje;
}

/** Mensaje de error de un campo combinando la validación JS y la del navegador. */
function obtenerMensajeCampo(nombreCampo, errores) {
  const mensaje = errores[nombreCampo];
  if (mensaje !== undefined) return mensaje;
  // Restricción HTML5 del control email (type="email")
  if (nombreCampo === "email" && campos.email.validity.typeMismatch) {
    return "El correo no tiene un formato válido (ejemplo: nombre@dominio.es).";
  }
  return "";
}

/** Valida un campo durante la edición. */
function validarCampo(nombreCampo) {
  const resultado = validarDatosPedido(obtenerDatosFormulario());
  aplicarError(nombreCampo, ""); // limpiamos antes para leer validity sin el error anterior
  aplicarError(nombreCampo, obtenerMensajeCampo(nombreCampo, resultado.errores));
}

/** Valida todos los campos (al enviar). Devuelve el resultado de validarDatosPedido. */
function validarFormularioCompleto() {
  const resultado = validarDatosPedido(obtenerDatosFormulario());
  CAMPOS_FORMULARIO.forEach(nombreCampo => {
    aplicarError(nombreCampo, "");
    aplicarError(nombreCampo, obtenerMensajeCampo(nombreCampo, resultado.errores));
  });
  return resultado;
}

function limpiarErrores() {
  CAMPOS_FORMULARIO.forEach(nombreCampo => aplicarError(nombreCampo, ""));
}

/** Muestra u oculta los datos postales según la modalidad elegida. */
function actualizarModalidad() {
  const esEnvio = campos.entrega.value === "envio";
  datosEnvio.hidden = !esEnvio;
  campos.direccion.required = esEnvio;
  campos.cp.required = esEnvio;
  if (!esEnvio) {
    // Al pasar a recogida no deben quedar errores personalizados en los campos postales
    aplicarError("direccion", "");
    aplicarError("cp", "");
  }
}

function actualizarContador() {
  const longitud = campos.observaciones.value.length;
  contadorObservaciones.textContent = longitud + " / " + MAX_OBSERVACIONES;
}

function gestionarInput(event) {
  const nombreCampo = event.target.name;
  if (nombreCampo === "observaciones") actualizarContador();
  if (nombreCampo === "entrega" || nombreCampo === "acepto") return; // se tratan en change
  if (CAMPOS_FORMULARIO.includes(nombreCampo)) validarCampo(nombreCampo);
}

function gestionarChange(event) {
  const nombreCampo = event.target.name;
  if (nombreCampo === "entrega") {
    actualizarModalidad();
    validarCampo("entrega");
  } else if (nombreCampo === "acepto") {
    validarCampo("acepto");
  }
}

/** Envío del formulario: validación completa, comprobación de stock y confirmación. */
function gestionarEnvio(event) {
  event.preventDefault();
  mostrarMensajePedido("", "");

  const resultado = validarFormularioCompleto();
  if (!formulario.checkValidity()) {
    formulario.reportValidity();
    mostrarMensajePedido("Revisa los campos marcados en el formulario.", "error");
    return;
  }

  if (carrito.length === 0) {
    mostrarMensajePedido("El carrito está vacío: añade algún producto antes de confirmar.", "error");
    return;
  }

  // Validación de stock por separado, antes de tocar el catálogo
  const erroresStock = validarStockCarrito(carrito, catalogo);
  if (erroresStock.length > 0) {
    mostrarMensajePedido(erroresStock.join(" "), "error");
    return;
  }

  const pedido = crearPedido(siguienteNumeroPedido, new Date(), resultado.datos, carrito, catalogo);
  if (pedido === null) {
    mostrarMensajePedido("No se ha podido calcular el pedido.", "error");
    return;
  }

  // A partir de aquí todo es correcto: se modifican las colecciones
  aplicarPedidoAlCatalogo(pedido, catalogo);
  pedidos.push(pedido);
  siguienteNumeroPedido++;
  carrito.splice(0, carrito.length);

  formulario.reset();
  limpiarErrores();
  actualizarModalidad();
  actualizarContador();

  mostrarCatalogo();
  mostrarCarrito();
  mostrarHistorial();
  mostrarMensajePedido("Pedido nº " + pedido.numero + " confirmado. Total: " +
                       formatearPrecio(pedido.total) + ".", "ok");
}


// ---------- Historial ----------

function crearEntradaPedido(pedido) {
  const detalle = document.createElement("details");

  const resumen = crearElemento("summary",
    "Pedido nº " + pedido.numero + " · " + formatearFecha(pedido.fecha) + " · " +
    pedido.cliente.nombre + " · " + ETIQUETAS_MODALIDAD[pedido.entrega.modalidad] + " · " +
    formatearPrecio(pedido.total));

  const lista = document.createElement("ul");
  pedido.lineas.forEach(linea => {
    lista.append(crearElemento("li",
      linea.nombre + ": " + linea.cantidad + " × " + formatearPrecio(linea.precio) +
      " = " + formatearPrecio(linea.importe)));
  });

  const importes = crearElemento("p",
    "Subtotal: " + formatearPrecio(pedido.subtotal) +
    " · Descuento: " + formatearPrecio(pedido.descuento) +
    " · Total: " + formatearPrecio(pedido.total));

  const contacto = crearElemento("p", "Correo: " + pedido.cliente.email);
  detalle.append(resumen, lista, importes, contacto);

  if (pedido.entrega.modalidad === "envio") {
    detalle.append(crearElemento("p",
      "Envío a: " + pedido.entrega.direccion + " (" + pedido.entrega.codigoPostal + ")"));
  }
  if (pedido.observaciones !== "") {
    detalle.append(crearElemento("p", "Observaciones: " + pedido.observaciones));
  }
  return detalle;
}

function mostrarHistorial() {
  let modalidad = filtroHistorial.value;
  if (modalidad !== "todos" && !MODALIDADES.includes(modalidad)) {
    modalidad = "todos";
    filtroHistorial.value = "todos";
  }

  const filtrados = filtrarPedidos(pedidos, modalidad);
  listaPedidos.replaceChildren();
  filtrados.forEach(pedido => {
    listaPedidos.append(crearEntradaPedido(pedido));
  });

  const resumen = resumirPedidos(filtrados);
  resumenHistorial.textContent = "Pedidos: " + resumen.cantidad +
    " · Importe total: " + formatearPrecio(resumen.importe);

  if (filtrados.length === 0) {
    historialVacio.hidden = false;
    historialVacio.textContent = pedidos.length === 0
      ? "Todavía no hay pedidos."
      : "Ningún pedido coincide con el filtro seleccionado.";
  } else {
    historialVacio.hidden = true;
  }
}

function exportarHistorial() {
  jsonExportado.value = JSON.stringify(pedidos, null, 2);
  jsonExportado.hidden = false;
  jsonExportado.focus();
  jsonExportado.select();   // queda seleccionado para copiarlo
}


// ---------- Registro de eventos ----------
buscador.addEventListener("input", () => mostrarCatalogo());
filtroCategoria.addEventListener("change", () => mostrarCatalogo());
listaProductos.addEventListener("click", gestionarAnadir);
listaProductos.addEventListener("input", limpiarAvisoCantidad);
lineasCarrito.addEventListener("click", gestionarRetirar);
formulario.addEventListener("input", gestionarInput);
formulario.addEventListener("change", gestionarChange);
formulario.addEventListener("submit", gestionarEnvio);
filtroHistorial.addEventListener("change", () => mostrarHistorial());
botonExportar.addEventListener("click", exportarHistorial);


// ---------- Arranque ----------
mostrarCatalogo();
mostrarCarrito();
actualizarModalidad();
actualizarContador();
mostrarHistorial();
