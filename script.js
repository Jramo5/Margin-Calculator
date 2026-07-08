/* ==========================================================================
   CALCULADORA DE MÁRGENES Y PRECIO DE MAYOREO
   --------------------------------------------------------------------------
   Lógica principal:
     1) precioUnitario = costo + (costo * margen / 100)
     2) El descuento sobre el margen SOLO afecta el margen, nunca el costo:
          nuevoMargen   = margen - (margen * descuentoMargen / 100)
          precioMayoreo = costo + nuevoMargen
   ========================================================================== */

(function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* Referencias al DOM                                                  */
  /* ------------------------------------------------------------------ */
  const form = document.getElementById('calc-form');

  const inputCosto = document.getElementById('costo');
  const inputMargen = document.getElementById('margen');
  const inputDescuento = document.getElementById('descuento');

  const inputs = [inputCosto, inputMargen, inputDescuento];

  const errorCosto = document.getElementById('error-costo');
  const errorMargen = document.getElementById('error-margen');
  const errorDescuento = document.getElementById('error-descuento');

  const resCosto = document.getElementById('res-costo');
  const resMargen = document.getElementById('res-margen');
  const resPrecioUnitario = document.getElementById('res-precio-unitario');
  const resDescuento = document.getElementById('res-descuento');
  const resMargenFinal = document.getElementById('res-margen-final');
  const resPrecioMayoreo = document.getElementById('res-precio-mayoreo');

  const flowCost = document.getElementById('flow-cost');
  const flowMargin = document.getElementById('flow-margin');

  const btnLimpiar = document.getElementById('btn-limpiar');

  /* ------------------------------------------------------------------ */
  /* Utilidades                                                          */
  /* ------------------------------------------------------------------ */

  /**
   * Convierte un valor de texto a número, o null si está vacío/ inválido.
   */
  function parseValue(rawValue) {
    if (rawValue === null || rawValue === undefined) return null;
    const trimmed = String(rawValue).trim();
    if (trimmed === '' || trimmed === '.') return null;
    const num = Number(trimmed);
    return Number.isFinite(num) ? num : null;
  }

  /**
   * Formatea un número como moneda con dos decimales, ej: $15.00
   */
  function formatCurrency(num) {
    return '$' + num.toFixed(2);
  }

  /**
   * Formatea un número como porcentaje simple con dos decimales.
   */
  function formatMoney(num) {
    return '$' + num.toFixed(2);
  }

  /**
   * Anima brevemente un elemento de resultado al actualizarse.
   */
  function pulse(el) {
    el.classList.remove('updated');
    // Forzar reflow para reiniciar la animación
    void el.offsetWidth;
    el.classList.add('updated');
  }

  /**
   * Muestra/oculta un mensaje de error en un campo dado.
   */
  function setFieldError(inputEl, errorEl, message) {
    if (message) {
      errorEl.textContent = message;
      errorEl.classList.add('show');
      inputEl.parentElement.classList.add('has-error');
    } else {
      errorEl.textContent = '';
      errorEl.classList.remove('show');
      inputEl.parentElement.classList.remove('has-error');
    }
  }

  /**
   * Restablece todos los resultados a su estado vacío ("--").
   */
  function resetResults() {
    [resCosto, resMargen, resPrecioUnitario, resDescuento, resMargenFinal, resPrecioMayoreo]
      .forEach((el) => { el.textContent = '--'; });

    flowCost.style.width = '50%';
    flowMargin.style.width = '50%';
  }

  /* ------------------------------------------------------------------ */
  /* Filtrado de entrada: solo números y un único punto decimal          */
  /* ------------------------------------------------------------------ */
  function sanitizeNumericInput(e) {
    const el = e.target;
    const previousValue = el.dataset.prevValue || '';
    let value = el.value;

    // Permitir únicamente dígitos y un solo punto decimal.
    value = value.replace(/[^0-9.]/g, '');

    // Evitar múltiples puntos decimales.
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }

    if (value !== el.value) {
      el.value = value;
    }

    el.dataset.prevValue = el.value;

    if (el.value === previousValue && e.inputType === undefined) {
      // no-op, evita bucles en navegadores antiguos
    }
  }

  /* ------------------------------------------------------------------ */
  /* Cálculo principal                                                   */
  /* ------------------------------------------------------------------ */
  function calcular() {
    const costoRaw = parseValue(inputCosto.value);
    const margenRaw = parseValue(inputMargen.value);
    const descuentoRaw = parseValue(inputDescuento.value);

    // Limpiar errores previos.
    setFieldError(inputCosto, errorCosto, '');
    setFieldError(inputMargen, errorMargen, '');
    setFieldError(inputDescuento, errorDescuento, '');

    // Si algún campo está vacío, mostrar "--" sin generar errores.
    if (costoRaw === null || margenRaw === null || descuentoRaw === null) {
      resetResults();
      return;
    }

    let hasBlockingError = false;

    // Validación: costo negativo -> mensaje, pero no bloquea el cálculo visualmente si se corrige.
    if (costoRaw < 0) {
      setFieldError(inputCosto, errorCosto, 'El costo no puede ser negativo.');
      hasBlockingError = true;
    }

    // Validación: porcentajes negativos -> impiden el cálculo.
    if (margenRaw < 0) {
      setFieldError(inputMargen, errorMargen, 'El margen no puede ser negativo.');
      hasBlockingError = true;
    }

    if (descuentoRaw < 0) {
      setFieldError(inputDescuento, errorDescuento, 'El descuento no puede ser negativo.');
      hasBlockingError = true;
    }

    if (hasBlockingError) {
      resetResults();
      return;
    }

    /* ---------------- Paso 1: Precio unitario ---------------- */
    const costo = costoRaw;
    const margenMonto = costo * (margenRaw / 100);
    const precioUnitario = costo + margenMonto;

    /* ---------------- Paso 2: Precio de mayoreo ----------------
       El descuento se aplica ÚNICAMENTE sobre el margen agregado,
       nunca sobre el costo base del producto.
    ------------------------------------------------------------- */
    const descuentoMonto = margenMonto * (descuentoRaw / 100);
    const margenFinal = margenMonto - descuentoMonto;
    const precioMayoreo = costo + margenFinal;

    /* ---------------- Pintar resultados ---------------- */
    updateResult(resCosto, formatCurrency(costo));
    updateResult(resMargen, formatMoney(margenMonto));
    updateResult(resPrecioUnitario, formatCurrency(precioUnitario));
    updateResult(resDescuento, formatMoney(descuentoMonto));
    updateResult(resMargenFinal, formatMoney(margenFinal));
    updateResult(resPrecioMayoreo, formatCurrency(precioMayoreo));

    /* ---------------- Actualizar barra visual ---------------- */
    updateFlowBar(costo, margenFinal);
  }

  /**
   * Actualiza el texto de un elemento resultado y dispara animación.
   */
  function updateResult(el, text) {
    if (el.textContent !== text) {
      el.textContent = text;
      pulse(el);
    }
  }

  /**
   * Actualiza el ancho de los segmentos de la barra visual costo/margen.
   */
  function updateFlowBar(costo, margenFinal) {
    const total = costo + margenFinal;

    if (total <= 0) {
      flowCost.style.width = '50%';
      flowMargin.style.width = '50%';
      return;
    }

    const costPct = Math.max(4, Math.min(96, (costo / total) * 100));
    const marginPct = 100 - costPct;

    flowCost.style.width = costPct + '%';
    flowMargin.style.width = marginPct + '%';
  }

  /* ------------------------------------------------------------------ */
  /* Eventos                                                             */
  /* ------------------------------------------------------------------ */

  // Cálculo automático mientras el usuario escribe.
  inputs.forEach((input) => {
    input.addEventListener('input', (e) => {
      sanitizeNumericInput(e);
      calcular();
    });

    // Impedir el pegado de texto no numérico.
    input.addEventListener('paste', (e) => {
      const pasted = (e.clipboardData || window.clipboardData).getData('text');
      if (!/^[0-9.]*$/.test(pasted)) {
        e.preventDefault();
      }
    });

    // Bloquear teclas de letras/símbolos no permitidos (excepto teclas de control).
    input.addEventListener('keydown', (e) => {
      const allowedKeys = [
        'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
        'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'
      ];
      if (allowedKeys.includes(e.key) || e.ctrlKey || e.metaKey) return;

      const isDigit = /^[0-9]$/.test(e.key);
      const isDot = e.key === '.' && !e.target.value.includes('.');

      if (!isDigit && !isDot) {
        e.preventDefault();
      }
    });
  });

  // Botón "Calcular" (el cálculo ya es automático, pero se respeta el botón).
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    calcular();
  });

  // Botón "Limpiar".
  btnLimpiar.addEventListener('click', () => {
    inputs.forEach((input) => {
      input.value = '';
      input.dataset.prevValue = '';
    });

    setFieldError(inputCosto, errorCosto, '');
    setFieldError(inputMargen, errorMargen, '');
    setFieldError(inputDescuento, errorDescuento, '');

    resetResults();
    inputCosto.focus();
  });

  /* ------------------------------------------------------------------ */
  /* Estado inicial                                                      */
  /* ------------------------------------------------------------------ */
  resetResults();

})();
