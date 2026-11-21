"use strict";

/*
 * logica.js
 * Datos fijos, clase Producto y funciones de cálculo y validación.
 * Ninguna función de este fichero lee ni modifica el DOM: reciben sus datos
 * por parámetros y devuelven resultados (sesión 8, responsabilidad única).
 */

// ---------- Constantes de la aplicación ----------
const CATEGORIAS = ["perifericos", "almacenamiento", "oficina"];
const MODALIDADES = ["recogida", "envio"];
const UMBRAL_DESCUENTO = 100;      // euros
const PORCENTAJE_DESCUENTO = 10;   // se expresa como 10, no como 0.1
const MAX_OBSERVACIONES = 200;

// Código postal español: 5 cifras y provincia entre 01 y 52.
// Grupo con tres alternativas: 01-09 | 10-49 | 50-52, y después tres cifras.
const REGEX_CP = /^(0[1-9]|[1-4][0-9]|5[0-2])[0-9]{3}$/;

// Formato básico de correo: texto@texto.texto, sin espacios.
// Solo comprueba la forma; no acredita que la dirección exista.
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


// ---------- Clase Producto (sesión 10) ----------
class Producto {
  constructor(id, nombre, categoria, precio, stock) {
    const idValido = Number.isInteger(id) && id > 0;
    const nombreValido = typeof nombre === "string" && nombre.trim() !== "";
    const categoriaValida = CATEGORIAS.includes(categoria);
    const precioValido = Number.isFinite(precio) && precio > 0;
    const stockValido = Number.isInteger(stock) && stock >= 0;
    if (!idValido || !nombreValido || !categoriaValida || !precioValido || !stockValido) {
      throw new TypeError("Datos de producto no válidos");
    }
    this.id = id;
    this.nombre = nombre.trim();
    this.categoria = categoria;
    this.precio = precio;
    this.stock = stock;
  }

  /** Devuelve true si la cantidad es un entero positivo que no supera el stock. */
  tieneDisponible(cantidad) {
    return Number.isInteger(cantidad) && cantidad > 0 && cantidad <= this.stock;
  }

  /**
   * Descuenta unidades tras una compra. Modifica el stock solo si hay
   * existencias suficientes. Devuelve true si se ha descontado.
   */
  descontarStock(cantidad) {
    if (!this.tieneDisponible(cantidad)) return false;
    this.stock = this.stock - cantidad;
    return true;
  }

  hayStock() {
    return this.stock > 0;
  }
}

/**
 * Crea el catálogo a partir de datos literales. Comprueba que los id
 * no se repitan (la clase no conoce las demás instancias).
 * @param {Array<object>} datos
 * @returns {Array<Producto>}
 */
function crearCatalogo(datos) {
  const catalogo = [];
  datos.forEach(dato => {
    const repetido = catalogo.find(producto => producto.id === dato.id);
    if (repetido !== undefined) {
      throw new Error("Identificador de producto repetido: " + dato.id);
    }
    catalogo.push(new Producto(dato.id, dato.nombre, dato.categoria, dato.precio, dato.stock));
  });
  return catalogo;
}

/** Busca un producto por id. Devuelve el producto o undefined. */
function buscarProducto(catalogo, id) {
  return catalogo.find(producto => producto.id === id);
}


// ---------- Importes ----------

/** Redondea a céntimos sin convertir a cadena (sigue siendo un número). */
function redondearImporte(importe) {
  return Math.round(importe * 100) / 100;
}

/**
 * Formatea un importe para mostrarlo. La cadena solo se usa para presentar,
 * nunca para seguir calculando.
 * @returns {string|null} "12.50 €" o null si el importe no es válido.
 */
function formatearPrecio(importe) {
  if (!Number.isFinite(importe) || importe < 0) return null;
  return importe.toFixed(2) + " €";
}

/**
 * Suma precio × cantidad de cada línea del carrito.
 * @param {Array<{productoId:number, cantidad:number}>} carrito
 * @param {Array<Producto>} catalogo
 * @returns {number|null} Subtotal o null si alguna línea no es válida.
 */
function calcularSubtotal(carrito, catalogo) {
  let subtotal = 0;
  for (const linea of carrito) {
    const producto = buscarProducto(catalogo, linea.productoId);
    if (producto === undefined) return null;
    if (!Number.isInteger(linea.cantidad) || linea.cantidad <= 0) return null;
    subtotal += producto.precio * linea.cantidad;
  }
  return redondearImporte(subtotal);
}

/**
 * Calcula el importe de la rebaja (no el precio final).
 * @param {number} subtotal Importe finito no negativo.
 * @param {number} porcentaje Valor entre 0 y 100. Por defecto, 0.
 * @returns {number|null} Importe del descuento o null si los datos no son válidos.
 */
function calcularDescuento(subtotal, porcentaje = 0) {
  if (!Number.isFinite(subtotal) || subtotal < 0) return null;
  if (!Number.isFinite(porcentaje) || porcentaje < 0 || porcentaje > 100) return null;
  return redondearImporte(subtotal * porcentaje / 100);
}

/** Porcentaje que corresponde al subtotal: 10 si llega a 100 €, 0 si no. */
function obtenerPorcentajeDescuento(subtotal) {
  return subtotal >= UMBRAL_DESCUENTO ? PORCENTAJE_DESCUENTO : 0;
}

/** Suma las unidades de todas las líneas del carrito. */
function contarUnidades(carrito) {
  let unidades = 0;
  carrito.forEach(linea => {
    unidades += linea.cantidad;
  });
  return unidades;
}

/**
 * Reúne todos los importes del carrito.
 * @returns {{unidades:number, subtotal:number, descuento:number, total:number}|null}
 */
function calcularResumenCarrito(carrito, catalogo) {
  const subtotal = calcularSubtotal(carrito, catalogo);
  if (subtotal === null) return null;
  const descuento = calcularDescuento(subtotal, obtenerPorcentajeDescuento(subtotal));
  if (descuento === null) return null;
  return {
    unidades: contarUnidades(carrito),
    subtotal,
    descuento,
    total: redondearImporte(subtotal - descuento)
  };
}

/**
 * Transforma las líneas del carrito en líneas con nombre, precio e importe
 * de este momento. Sirve para pintar el carrito y para guardar el pedido.
 */
function crearLineasDetalle(carrito, catalogo) {
  const lineas = carrito.map(linea => {
    const producto = buscarProducto(catalogo, linea.productoId);
    if (producto === undefined) return null;
    return {
      productoId: producto.id,
      nombre: producto.nombre,
      precio: producto.precio,
      cantidad: linea.cantidad,
      importe: redondearImporte(producto.precio * linea.cantidad)
    };
  });
  return lineas.filter(linea => linea !== null);
}


// ---------- Catálogo ----------

/**
 * Filtra por nombre (sin distinguir mayúsculas) y por categoría.
 * @param {string} texto Texto buscado; vacío = no filtra por nombre.
 * @param {string} categoria "todas" o una de CATEGORIAS.
 */
function filtrarCatalogo(catalogo, texto, categoria) {
  const buscado = texto.trim().toLowerCase();
  return catalogo.filter(producto => {
    const coincideNombre = buscado === "" || producto.nombre.toLowerCase().includes(buscado);
    const coincideCategoria = categoria === "todas" || producto.categoria === categoria;
    return coincideNombre && coincideCategoria;
  });
}


// ---------- Carrito ----------

/**
 * Añade una cantidad al carrito. Si el producto ya está, suma la cantidad
 * en lugar de crear otra línea. No descuenta stock.
 * Modifica el array carrito de forma intencionada.
 * @returns {{ok:boolean, mensaje:string}}
 */
function agregarAlCarrito(carrito, catalogo, productoId, cantidad) {
  const producto = buscarProducto(catalogo, productoId);
  if (producto === undefined) {
    return { ok: false, mensaje: "El producto no existe." };
  }
  if (!producto.hayStock()) {
    return { ok: false, mensaje: "Este producto no tiene existencias." };
  }
  if (!Number.isInteger(cantidad) || cantidad <= 0) {
    return { ok: false, mensaje: "Indica una cantidad entera mayor que cero." };
  }

  const linea = carrito.find(elemento => elemento.productoId === productoId);
  const yaEnCarrito = linea === undefined ? 0 : linea.cantidad;

  if (!producto.tieneDisponible(yaEnCarrito + cantidad)) {
    return {
      ok: false,
      mensaje: "Solo hay " + producto.stock + " unidades y ya tienes " +
               yaEnCarrito + " en el carrito."
    };
  }

  if (linea === undefined) {
    carrito.push({ productoId, cantidad });
  } else {
    linea.cantidad += cantidad;
  }
  return { ok: true, mensaje: "Añadidas " + cantidad + " unidades al carrito." };
}

/** Retira la línea completa de un producto. Devuelve true si la había. */
function retirarDelCarrito(carrito, productoId) {
  const linea = carrito.find(elemento => elemento.productoId === productoId);
  const posicion = carrito.indexOf(linea);
  if (posicion === -1) return false;   // comprobar -1 antes de splice
  carrito.splice(posicion, 1);
  return true;
}

/**
 * Vuelve a comprobar el stock de todo el carrito antes de confirmar.
 * @returns {Array<string>} Mensajes de error; vacío si todo es correcto.
 */
function validarStockCarrito(carrito, catalogo) {
  const errores = [];
  carrito.forEach(linea => {
    const producto = buscarProducto(catalogo, linea.productoId);
    if (producto === undefined) {
      errores.push("Un producto del carrito ya no existe en el catálogo.");
    } else if (!producto.tieneDisponible(linea.cantidad)) {
      errores.push("No hay stock suficiente de " + producto.nombre +
                   " (disponibles: " + producto.stock + ").");
    }
  });
  return errores;
}


// ---------- Validación del pedido ----------

/**
 * Valida los datos del formulario de pedido.
 * @param {{nombre:string, email:string, entrega:string, direccion:string,
 *          cp:string, observaciones:string, acepto:boolean}} datos
 * @returns {{valido:boolean, errores:object, datos:object|null}}
 *   errores tiene una propiedad por campo incorrecto con su mensaje.
 *   datos contiene los valores normalizados, o null si hay errores.
 */
function validarDatosPedido(datos) {
  const errores = {};

  const nombre = typeof datos.nombre === "string" ? datos.nombre.trim() : "";
  if (nombre === "") {
    errores.nombre = "El nombre y apellidos son obligatorios.";
  } else if (nombre.length < 2 || nombre.length > 60) {
    errores.nombre = "El nombre debe tener entre 2 y 60 caracteres.";
  }

  const email = typeof datos.email === "string" ? datos.email.trim() : "";
  if (email === "") {
    errores.email = "El correo electrónico es obligatorio.";
  } else if (!REGEX_EMAIL.test(email)) {
    errores.email = "El correo no tiene un formato válido (ejemplo: nombre@dominio.es).";
  }

  // No confiamos en el valor del radio: comprobamos las opciones admitidas.
  const entrega = datos.entrega;
  if (!MODALIDADES.includes(entrega)) {
    errores.entrega = "Elige recogida en tienda o envío a domicilio.";
  }

  let direccion = "";
  let cp = "";
  if (entrega === "envio") {
    direccion = typeof datos.direccion === "string" ? datos.direccion.trim() : "";
    cp = typeof datos.cp === "string" ? datos.cp.trim() : "";

    if (direccion === "") {
      errores.direccion = "La dirección es obligatoria para el envío.";
    } else if (direccion.length < 5 || direccion.length > 100) {
      errores.direccion = "La dirección debe tener entre 5 y 100 caracteres.";
    }

    if (cp === "") {
      errores.cp = "El código postal es obligatorio para el envío.";
    } else if (!REGEX_CP.test(cp)) {
      errores.cp = "Código postal no válido: 5 cifras y provincia entre 01 y 52.";
    }
  }

  const observaciones = typeof datos.observaciones === "string" ? datos.observaciones.trim() : "";
  if (observaciones.length > MAX_OBSERVACIONES) {
    errores.observaciones = "Las observaciones no pueden superar los 200 caracteres.";
  }

  if (datos.acepto !== true) {
    errores.acepto = "Debes confirmar que los datos del pedido son correctos.";
  }

  const valido = Object.keys(errores).length === 0;
  return {
    valido,
    errores,
    datos: valido ? { nombre, email, entrega, direccion, cp, observaciones } : null
  };
}


// ---------- Pedidos ----------

/**
 * Crea el objeto pedido con una copia de las líneas (nombre y precio de
 * este momento), de modo que no cambie aunque luego cambie el catálogo.
 * No modifica el catálogo ni el carrito.
 */
function crearPedido(numero, fecha, datosCliente, carrito, catalogo) {
  const resumen = calcularResumenCarrito(carrito, catalogo);
  if (resumen === null) return null;
  return {
    numero,
    fecha: fecha.toISOString(),
    cliente: { nombre: datosCliente.nombre, email: datosCliente.email },
    entrega: {
      modalidad: datosCliente.entrega,
      direccion: datosCliente.direccion,
      codigoPostal: datosCliente.cp
    },
    observaciones: datosCliente.observaciones,
    lineas: crearLineasDetalle(carrito, catalogo),
    unidades: resumen.unidades,
    subtotal: resumen.subtotal,
    descuento: resumen.descuento,
    total: resumen.total
  };
}

/** Descuenta del catálogo las unidades de un pedido ya validado. */
function aplicarPedidoAlCatalogo(pedido, catalogo) {
  pedido.lineas.forEach(linea => {
    const producto = buscarProducto(catalogo, linea.productoId);
    if (producto !== undefined) {
      producto.descontarStock(linea.cantidad);
    }
  });
}

/** Devuelve los pedidos de una modalidad, o todos con "todos". */
function filtrarPedidos(pedidos, modalidad) {
  if (modalidad === "todos") return pedidos.slice();
  return pedidos.filter(pedido => pedido.entrega.modalidad === modalidad);
}

/** Número de pedidos y suma de sus totales. Con [] devuelve 0 y 0 (nunca NaN). */
function resumirPedidos(lista) {
  let importe = 0;
  for (const pedido of lista) {
    importe += pedido.total;
  }
  return { cantidad: lista.length, importe: redondearImporte(importe) };
}
