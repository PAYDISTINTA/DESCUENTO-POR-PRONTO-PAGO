// --- 1. MOTOR DE TIEMPO: CICLO SÁBADO A JUEVES ---
function calcularSemanasNegocio(fechaVentaStr, fechaPagoStr) {
    let venta = new Date(fechaVentaStr + "T00:00:00");
    let pago = new Date(fechaPagoStr + "T00:00:00");

    // REGLA: Si se paga en Viernes (día 5), se pasa al Sábado (día 6) siguiente
    if (pago.getDay() === 5) {
        pago.setDate(pago.getDate() + 1);
    }

    // Encontrar el Sábado anterior o igual a la fecha de venta
    let sabadoOrigen = new Date(venta);
    let diaSemanaVenta = venta.getDay(); 
    let diasRestar = (diaSemanaVenta === 6) ? 0 : (diaSemanaVenta + 1);
    sabadoOrigen.setDate(sabadoOrigen.getDate() - diasRestar);

    // Diferencia en días naturales
    const diffTiempo = pago - sabadoOrigen;
    const diffDias = Math.floor(diffTiempo / (1000 * 60 * 60 * 24));

    // Cada bloque de 7 días cuenta como semana transcurrida (Inicia en Semana 1)
    let semanasTranscurridas = Math.floor(diffDias / 7) + 1;

    return semanasTranscurridas < 1 ? 1 : semanasTranscurridas;
}

// --- 2. MOTOR FINANCIERO: CÁLCULO DE SALDOS Y DESCUENTOS ---
function procesarCalculosAutomaticos() {
    // Capturar los valores manuales (Rojos) de la pantalla
    const cliente = document.getElementById('cliente').value;
    const fechaVentaStr = document.getElementById('fechaVenta').value;
    const semanasPactadas = parseInt(document.getElementById('semanasPactadas').value) || 0;
    const pagoSemanal = parseFloat(document.getElementById('pagoSemanal').value) || 0;
    const precioContado = parseFloat(document.getElementById('precioContado').value) || 0;
    const pagadoAcumulado = parseFloat(document.getElementById('pagadoAcumulado').value) || 0;

    if (!fechaVentaStr || semanasPactadas <= 0 || pagoSemanal <= 0) return;

    // Obtener la fecha del día de hoy en formato AAAA-MM-DD automáticamente
    const hoyStr = new Date().toISOString().split('T')[0];

    // Ejecutar cálculo de tiempo
    const semanasTranscurridas = calcularSemanasNegocio(fechaVentaStr, hoyStr);

    // Ejecutar fórmulas del Excel
    const totalCredito = semanasPactadas * pagoSemanal;
    const financiamientoTotal = totalCredito - precioContado;
    const saldoRegular = totalCredito - pagadoAcumulado;

    const financiamientoPorSemana = financiamientoTotal / semanasPactadas;
    const financiamientoDevengado = financiamientoPorSemana * semanasTranscurridas;
    
    const montoTeoricoAFecha = precioContado + financiamientoDevengado;
    let porPagarNeto = montoTeoricoAFecha - pagadoAcumulado;

    // Evitar saldos negativos
    if (porPagarNeto < 0) porPagarNeto = 0;

    const descuentoOtorgado = saldoRegular - porPagarNeto;

    // --- 3. MOSTRAR RESULTADOS EN PANTALLA ---
    document.getElementById('calcSemanas').value = semanasTranscurridas;
    document.getElementById('calcSaldoRegular').value = saldoRegular.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    document.getElementById('calcDescuento').value = descuentoOtorgado.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    document.getElementById('calcNeto').value = porPagarNeto.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // Guardar temporalmente los datos para el botón de WhatsApp
    window.datosActuales = {
        cliente: cliente,
        idFactura: "CR-580", // Temporal simulado
        saldoRegular: saldoRegular,
        descuento: descuentoOtorgado,
        neto: porPagarNeto,
        semana: semanasTranscurridas
    };
}

// --- 4. INTEGRACIÓN AUTOMÁTICA CON WHATSAPP ---
function enviarWhatsApp() {
    if (!window.datosActuales) return;
    const d = window.datosActuales;
    const hoy = new Date().toLocaleDateString('es-MX');

    const mensaje = `Estimada *${d.cliente}*, le saludamos de la empresa.\n\n` +
                    `Consultamos el estado de su crédito al día de hoy (*${hoy}*). Al encontrarse en la semana *${d.semana}* de su plan, le ofrecemos la opción de liquidar anticipadamente con un descuento especial:\n\n` +
                    `• *Saldo Regular Pendiente:* $${d.saldoRegular.toFixed(2)}\n` +
                    `• *Descuento Especial Hoy:* -$${d.descuento.toFixed(2)}\n` +
                    `• *MONTO PARA LIQUIDAR HOY:* *$${d.neto.toFixed(2)}* 🔥\n\n` +
                    `_*Este beneficio es válido únicamente realizando su pago el día de hoy, ya que el descuento varía de forma semanal según el tiempo transcurrido._\n\n` +
                    `Si desea aprovecharlo, por favor respóndanos este mensaje. ¡Muchas gracias!`;

    const url = `https://wa.me{encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
}

// --- 5. ESCUCHAR CAMBIOS EN LA PANTALLA ---
// Ejecutar cálculos en cuanto la pantalla cargue y cada vez que se modifique una celda roja
document.addEventListener('DOMContentLoaded', () => {
    procesarCalculosAutomaticos();
    
    const inputsManuales = document.querySelectorAll('.manual-input');
    inputsManuales.forEach(input => {
        input.addEventListener('input', procesarCalculosAutomaticos);
    });
});
