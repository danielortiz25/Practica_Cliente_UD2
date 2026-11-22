# Gestor de pedidos de material

Chat con IA https://claude.ai/share/90be7923-b66a-493d-af94-372c9912896b

Práctica de integración de DWEC (sesiones 8–13). Catálogo, carrito, formulario de pedido e historial con exportación JSON. Todo funciona en el navegador con HTML, CSS y JavaScript, sin frameworks ni persistencia.

## Estructura

```
index.html       Estructura de la página y formulario (novalidate)
css/estilos.css  Estilos básicos
js/logica.js     Clase Producto y funciones de cálculo/validación (sin DOM)
js/app.js        Datos iniciales, creación de nodos DOM y eventos
```

Los scripts se cargan con `defer` y en este orden: primero `logica.js` y después `app.js`.

## Cómo ejecutarla

Hay que abrirla con un servidor HTTP local, no con `file://`. Desde la carpeta del proyecto:

```
python3 -m http.server 8000
```

Después abre `http://localhost:8000`. También sirve la extensión Live Server de VS Code.

## Funciones pedidas en el enunciado

| Función | Fichero | Qué hace |
|---|---|---|
| `calcularSubtotal(carrito, catalogo)` | logica.js | Suma precio × cantidad. Devuelve `null` si una línea no es válida |
| `calcularDescuento(subtotal, porcentaje = 0)` | logica.js | Devuelve el importe de la rebaja. Tiene un parámetro por defecto |
| `validarDatosPedido(datos)` | logica.js | Devuelve `{ valido, errores, datos }` |
| `crearTarjetaProducto(producto)` | app.js | Crea el `<article>` del producto con `createElement` |

Otras funciones de `logica.js`:

- `obtenerPorcentajeDescuento`: devuelve 10 si el subtotal es de 100 € o más, y 0 si no.
- `calcularResumenCarrito`
- `agregarAlCarrito` y `retirarDelCarrito`
- `validarStockCarrito`: vuelve a comprobar el stock antes de confirmar.
- `crearPedido`
- `aplicarPedidoAlCatalogo`
- `filtrarCatalogo`
- `filtrarPedidos` y `resumirPedidos`

## Dónde se cumple cada requisito

- **Clase `Producto`**: tiene constructor con validación y los métodos `tieneDisponible(cantidad)`, `descontarStock(cantidad)` y `hayStock()`.
- **Métodos de array**:
  - `push`: alta en el carrito y en el historial.
  - `splice`: retirar una línea y vaciar el carrito.
  - `find`: buscar productos y líneas.
  - `filter`: catálogo e historial.
  - `map`: líneas de detalle del pedido.
  - `forEach`: pintar listas y descontar stock.
- **Delegación de eventos**:
  - Botones "Añadir" (en `#lista-productos`).
  - Botones "Retirar" (en `#lineas-carrito`).
- **Constraint Validation API**: se usan `setCustomValidity`, `validity.typeMismatch`, `checkValidity` y `reportValidity`.
- **Código postal**: se comprueba con `/^(0[1-9]|[1-4][0-9]|5[0-2])[0-9]{3}$/.test(cp)`.
- **Cantidad vacía**: `leerCantidad` devuelve `NaN` y no 0.
- **Sin `innerHTML`**: todo el texto se escribe con `textContent`.

## Datos de prueba

- Hay 8 productos en 3 categorías.
- El teclado (id 102) no tiene stock.
- El monitor (139 €) y la silla (115 €) permiten probar el descuento.
