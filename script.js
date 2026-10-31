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

  const btnModeForward = document.getElementById('btn-mode-forward');
  const btnModeReverse = document.getElementById('btn-mode-reverse');
  const modeHint = document.getElementById('mode-hint');
  const labelCosto = document.getElementById('label-costo');
  const labelResCosto = document.getElementById('label-res-costo');
  const labelResPrecioMayoreo = document.getElementById('label-res-precio-mayoreo');
  const labelResPrecioUnitario = document.getElementById('label-res-precio-unitario');

  /* --- Modo "Precio final de venta" --- */
  const btnModeVenta = document.getElementById('btn-mode-venta');
  const fieldsMargen = document.getElementById('fields-margen');
  const fieldsVenta = document.getElementById('fields-venta');
  const resultsMargen = document.getElementById('results-margen');
  const resultsVenta = document.getElementById('results-venta');
  const flowWrap = document.getElementById('flow-wrap');
  const footerNote = document.getElementById('footer-note');

  const vPrecio = document.getElementById('v-precio');
  const vComision = document.getElementById('v-comision');
  const vIva = document.getElementById('v-iva');
  const vDescuento = document.getElementById('v-descuento');
  const vDescuentoTipo = document.getElementById('v-descuento-tipo');
  const vPenalizacion = document.getElementById('v-penalizacion');
  const vPenalizacionTipo = document.getElementById('v-penalizacion-tipo');
  const vOtro = document.getElementById('v-otro');
  const vOtroTipo = document.getElementById('v-otro-tipo');

  const ventaInputs = [vPrecio, vComision, vIva, vDescuento, vPenalizacion, vOtro];
  const ventaSelects = [vDescuentoTipo, vPenalizacionTipo, vOtroTipo];

  const ventaErrors = {
    precio: document.getElementById('error-v-precio'),
    comision: document.getElementById('error-v-comision'),
    iva: document.getElementById('error-v-iva'),
    descuento: document.getElementById('error-v-descuento'),
    penalizacion: document.getElementById('error-v-penalizacion'),
    otro: document.getElementById('error-v-otro')
  };

  const ventaResults = {
    precio: document.getElementById('v-res-precio'),
    comision: document.getElementById('v-res-comision'),
    iva: document.getElementById('v-res-iva'),
    otro: document.getElementById('v-res-otro'),
    totalDescuento: document.getElementById('v-res-total-descuento'),
    subtotal: document.getElementById('v-res-subtotal'),
    penalizacion: document.getElementById('v-res-penalizacion'),
    descuento: document.getElementById('v-res-descuento'),
    totalPenDesc: document.getElementById('v-res-total-pen-desc'),
    final: document.getElementById('v-res-final')
  };

  const IVA_POR_DEFECTO = '13';

  // 'forward' = costo conocido -> calcula precio final
  // 'reverse' = precio final conocido -> calcula costo original
  // 'venta'   = precio inicial + comisión + IVA + otro - penalización - descuento
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
    if (mode === 'venta') {
      calcularVenta();
      return;
    }

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

  /* ------------------------------------------------------------------ */
  /* Cálculo: Precio final de venta                                      */
  /*   precioConComision = precio + comision + ivaComision + otro        */
  /*   precioFinal       = precioConComision - penalizacion - descuento  */
  /*   - comision (%) y sus montos se calculan sobre el precio inicial   */
  /*   - IVA (%) se calcula sobre el monto de la comisión                */
  /*   - otro / penalizacion / descuento: $ fijo o % del precio inicial  */
  /* ------------------------------------------------------------------ */
  function resetVentaResults() {
    Object.values(ventaResults).forEach((el) => { el.textContent = '--'; });
  }

  function clearVentaErrors() {
    ventaInputs.forEach((input) => {
      const key = input.id.replace('v-', '');
      setFieldError(input, ventaErrors[key], '');
    });
  }

  function montoSegunTipo(valor, tipo, base) {
    return tipo === '%' ? base * (valor / 100) : valor;
  }

  function calcularVenta() {
    clearVentaErrors();

    const precio = parseValue(vPrecio.value);

    // Solo el precio inicial es obligatorio; el resto vacío = 0.
    if (precio === null) {
      resetVentaResults();
      return;
    }

    const comisionPct = parseValue(vComision.value) ?? 0;
    const ivaPct = parseValue(vIva.value) ?? 0;
    const descuentoVal = parseValue(vDescuento.value) ?? 0;
    const penalizacionVal = parseValue(vPenalizacion.value) ?? 0;
    const otroVal = parseValue(vOtro.value) ?? 0;

    const checks = [
      [vPrecio, 'precio', precio, 'El precio no puede ser negativo.'],
      [vComision, 'comision', comisionPct, 'La comisión no puede ser negativa.'],
      [vIva, 'iva', ivaPct, 'El IVA no puede ser negativo.'],
      [vDescuento, 'descuento', descuentoVal, 'El descuento no puede ser negativo.'],
      [vPenalizacion, 'penalizacion', penalizacionVal, 'La penalización no puede ser negativa.'],
      [vOtro, 'otro', otroVal, 'El valor no puede ser negativo.']
    ];

    let hasError = false;
    checks.forEach(([input, key, value, msg]) => {
      if (value < 0) {
        setFieldError(input, ventaErrors[key], msg);
        hasError = true;
      }
    });

    if (hasError) {
      resetVentaResults();
      return;
    }

    const comision = precio * (comisionPct / 100);
    const ivaComision = comision * (ivaPct / 100);
    const otro = montoSegunTipo(otroVal, vOtroTipo.value, precio);
    const precioConComision = precio + comision + ivaComision + otro;

    const penalizacion = montoSegunTipo(penalizacionVal, vPenalizacionTipo.value, precio);
    const descuento = montoSegunTipo(descuentoVal, vDescuentoTipo.value, precio);
    const precioFinal = precioConComision - penalizacion - descuento;

    if (precioFinal < 0) {
      setFieldError(
        vDescuento,
        ventaErrors.descuento,
        'Penalización + descuento superan el precio con comisión.'
      );
      resetVentaResults();
      return;
    }

    updateResult(ventaResults.precio, formatMoney(precio));
    updateResult(ventaResults.comision, formatMoney(comision));
    updateResult(ventaResults.iva, formatMoney(ivaComision));
    updateResult(ventaResults.otro, formatMoney(otro));
    updateResult(ventaResults.totalDescuento, formatMoney(comision + ivaComision + otro));
    updateResult(ventaResults.subtotal, formatMoney(precioConComision));
    updateResult(ventaResults.penalizacion, formatMoney(penalizacion));
    updateResult(ventaResults.descuento, formatMoney(descuento));
    updateResult(ventaResults.totalPenDesc, formatMoney(penalizacion + descuento));
    updateResult(ventaResults.final, formatMoney(precioFinal));
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
    const isVenta = mode === 'venta';

    btnModeForward.classList.toggle('active', mode === 'forward');
    btnModeReverse.classList.toggle('active', isReverse);
    btnModeVenta.classList.toggle('active', isVenta);

    // Mostrar/ocultar bloques según el modo.
    fieldsMargen.classList.toggle('is-hidden', isVenta);
    fieldsVenta.classList.toggle('is-hidden', !isVenta);
    resultsMargen.classList.toggle('is-hidden', isVenta);
    resultsVenta.classList.toggle('is-hidden', !isVenta);
    flowWrap.classList.toggle('is-hidden', isVenta);

    if (isVenta) {
      modeHint.textContent = 'Al precio inicial le sumás comisión, IVA sobre la comisión y otros cargos; luego restás penalización y descuento.';
      footerNote.textContent = 'Comisión, otro, penalización y descuento en % se calculan sobre el precio inicial; el IVA se calcula sobre la comisión.';
    } else if (isReverse) {
      labelCosto.textContent = 'Precio final de venta';
      modeHint.textContent = 'Conocés el precio final y querés saber cuál fue el costo original (margen calculado sobre el precio de venta).';
      labelResCosto.textContent = 'Precio final (dato ingresado)';
      labelResPrecioMayoreo.textContent = 'Costo del producto (calculado)';
      labelResPrecioUnitario.textContent = 'Costo antes del descuento';
      footerNote.textContent = 'El costo del producto nunca se modifica. El descuento se aplica únicamente sobre el margen.';
    } else {
      labelCosto.textContent = 'Costo del producto';
      modeHint.textContent = 'Conocés el costo y querés saber el precio final (margen calculado sobre el costo).';
      labelResCosto.textContent = 'Costo del producto';
      labelResPrecioMayoreo.textContent = 'Precio de mayoreo';
      labelResPrecioUnitario.textContent = 'Precio unitario';
      footerNote.textContent = 'El costo del producto nunca se modifica. El descuento se aplica únicamente sobre el margen.';
    }

    setFieldError(inputCosto, errorCosto, '');
    setFieldError(inputMargen, errorMargen, '');
    setFieldError(inputDescuento, errorDescuento, '');
    clearVentaErrors();

    calcular();
  }

  btnModeForward.addEventListener('click', () => setMode('forward'));
  btnModeReverse.addEventListener('click', () => setMode('reverse'));
  btnModeVenta.addEventListener('click', () => setMode('venta'));

  /* ------------------------------------------------------------------ */
  /* Eventos                                                             */
  /* ------------------------------------------------------------------ */

  // Cálculo automático mientras el usuario escribe.
  [...inputs, ...ventaInputs].forEach((input) => {
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

  // Selectores $ / % del modo venta.
  ventaSelects.forEach((sel) => sel.addEventListener('change', calcular));

  // Botón "Calcular" (el cálculo ya es automático, pero se respeta el botón).
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    calcular();
  });

  // Botón "Limpiar".
  btnLimpiar.addEventListener('click', () => {
    if (mode === 'venta') {
      ventaInputs.forEach((input) => {
        input.value = '';
        input.dataset.prevValue = '';
      });
      vIva.value = IVA_POR_DEFECTO;
      ventaSelects.forEach((sel) => { sel.value = '%'; });
      clearVentaErrors();
      resetVentaResults();
      vPrecio.focus();
      return;
    }

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
  resetVentaResults();

})();
