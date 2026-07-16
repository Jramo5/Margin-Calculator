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

  const btnModeForward = document.getElementById('btn-mode-forward');
  const btnModeReverse = document.getElementById('btn-mode-reverse');
  const modeHint = document.getElementById('mode-hint');
  const labelCosto = document.getElementById('label-costo');
  const labelResCosto = document.getElementById('label-res-costo');
  const labelResPrecioMayoreo = document.getElementById('label-res-precio-mayoreo');
  const labelResPrecioUnitario = document.getElementById('label-res-precio-unitario');

  // 'forward' = costo conocido -> calcula precio final
  // 'reverse' = precio final conocido -> calcula costo original
  let mode = 'forward';

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

    let costo, margenMonto, precioUnitario, descuentoMonto, margenFinal, precioMayoreo;

    if (mode === 'reverse') {
      /* ---------------- MODO INVERSO ----------------
         El campo "costo" en realidad contiene el PRECIO FINAL
         ya conocido. Acá el margen se calcula como % del PRECIO
         DE VENTA (margen real), no como % del costo:
           margenMonto   = precio * margen/100
           descuentoMonto = margenMonto * descuento/100
           margenFinal    = margenMonto - descuentoMonto
           costo          = precio - margenFinal
      --------------------------------------------------- */
      precioMayoreo = costoRaw;

      margenMonto = precioMayoreo * (margenRaw / 100);
      descuentoMonto = margenMonto * (descuentoRaw / 100);
      margenFinal = margenMonto - descuentoMonto;
      costo = precioMayoreo - margenFinal;
      precioUnitario = precioMayoreo - margenMonto; // costo antes de aplicar el descuento al margen

      if (costo < 0) {
        setFieldError(
          inputMargen,
          errorMargen,
          'Ese margen supera el precio final; el costo no puede ser negativo.'
        );
        resetResults();
        return;
      }

    } else {
      /* ---------------- MODO NORMAL ----------------
         El costo es el dato conocido; se calcula el precio final.
         El margen se calcula como % del COSTO (markup).
      ------------------------------------------------- */
      costo = costoRaw;
      margenMonto = costo * (margenRaw / 100);
      precioUnitario = costo + margenMonto;
      descuentoMonto = margenMonto * (descuentoRaw / 100);
      margenFinal = margenMonto - descuentoMonto;
      precioMayoreo = costo + margenFinal;
    }

    /* ---------------- Pintar resultados ----------------
       En modo inverso, el dato que más importa (el costo
       calculado) se muestra en la fila destacada final;
       el precio ingresado pasa a la fila superior como referencia.
    ------------------------------------------------------ */
    if (mode === 'reverse') {
      updateResult(resCosto, formatCurrency(precioMayoreo));   // dato ingresado (arriba)
      updateResult(resPrecioMayoreo, formatCurrency(costo));   // resultado calculado (destacado)
    } else {
      updateResult(resCosto, formatCurrency(costo));
      updateResult(resPrecioMayoreo, formatCurrency(precioMayoreo));
    }

    updateResult(resMargen, formatMoney(margenMonto));
    updateResult(resPrecioUnitario, formatCurrency(precioUnitario));
    updateResult(resDescuento, formatMoney(descuentoMonto));
    updateResult(resMargenFinal, formatMoney(margenFinal));

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
  /* Cambio de modo (Costo → Precio  /  Precio → Costo)                  */
  /* ------------------------------------------------------------------ */
  function setMode(newMode) {
    mode = newMode;

    const isReverse = mode === 'reverse';

    btnModeForward.classList.toggle('active', !isReverse);
    btnModeReverse.classList.toggle('active', isReverse);

    if (isReverse) {
      labelCosto.textContent = 'Precio final de venta';
      modeHint.textContent = 'Conocés el precio final y querés saber cuál fue el costo original (margen calculado sobre el precio de venta).';
      labelResCosto.textContent = 'Precio final (dato ingresado)';
      labelResPrecioMayoreo.textContent = 'Costo del producto (calculado)';
      labelResPrecioUnitario.textContent = 'Costo antes del descuento';
    } else {
      labelCosto.textContent = 'Costo del producto';
      modeHint.textContent = 'Conocés el costo y querés saber el precio final (margen calculado sobre el costo).';
      labelResCosto.textContent = 'Costo del producto';
      labelResPrecioMayoreo.textContent = 'Precio de mayoreo';
      labelResPrecioUnitario.textContent = 'Precio unitario';
    }

    setFieldError(inputCosto, errorCosto, '');
    setFieldError(inputMargen, errorMargen, '');
    setFieldError(inputDescuento, errorDescuento, '');

    calcular();
  }

  btnModeForward.addEventListener('click', () => setMode('forward'));
  btnModeReverse.addEventListener('click', () => setMode('reverse'));

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
