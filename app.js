// --- 1. BUSCAR CLIENTE EN FIREBASE AUTOMÁTICAMENTE ---
async function buscarClientePorId(idInput) {
    if (!idInput) return;
    
    try {
        // Consulta directa a la base de datos de Firebase
        const docRef = db.collection('creditos').doc(`credito_${idInput}`);
        const doc = await docRef.get();
        
        if (doc.exists) {
            const datos = doc.data();
            
            // Llenar los campos manuales automáticamente con lo guardado en Firebase
            document.getElementById('cliente').value = datos.nombre_cliente;
            document.getElementById('fechaVenta').value = datos.fecha_venta;
            document.getElementById('semanasPactadas').value = datos.semanas_pactadas;
            document.getElementById('pagoSemanal').value = datos.pago_semanal;
            document.getElementById('precioContado').value = datos.precio_contado;
            
            // Consultar la subcolección del historial de abonos para sumar el acumulado
            const snapshotAbonos = await docRef.collection('historial_abonos').get();
            let totalAbonado = 0;
            snapshotAbonos.forEach(abono => {
                totalAbonado += parseFloat(abono.data().monto) || 0;
            });
            
            document.getElementById('pagadoAcumulado').value = totalAbonado;
            
            // Ejecutar las matemáticas operativas
            procesarCalculosAutomaticos();
        } else {
            alert("El ID de crédito no existe en el sistema.");
        }
    } catch (error) {
        console.error("Error al conectar con Firebase: ", error);
    }
}

// --- 2. REGISTRAR UN ABONO MANUAL EN EL HISTORIAL ---
async function registrarAbonoManual(idInput, montoAbono) {
    if (!idInput || montoAbono <= 0) return;
    
    try {
        const docRef = db.collection('creditos').doc(`credito_${idInput}`);
        
        // Guardar el abono de forma independiente en la subcolección
        await docRef.collection('historial_abonos').add({
            monto: parseFloat(montoAbono),
            fecha_pago: new Date().toISOString(), // Marca de tiempo real exacta
            registrado_por: "Personal Autorizado"
        });
        
        alert("Abono registrado exitosamente en el historial.");
        // Recargar la pantalla con el nuevo saldo acumulado
        buscarClientePorId(idInput);
    } catch (error) {
        alert("Error al registrar el abono.");
    }
}

// --- 3. MOTOR DE TIEMPO (SÁBADO A JUEVES) ---
function calcularSemanasNegocio(fechaVentaStr, fechaPagoStr) {
    let venta = new Date(fechaVentaStr + "T00:00:00");
    let pago = new Date(fechaPagoStr + "T00:00:00");

    if (pago.getDay() === 5) { pago.setDate(pago.getDate() + 1); }

    let sabadoOrigen = new Date(venta);
    let diaSemanaVenta = venta.getDay(); 
    let diasRestar = (diaSemanaVenta === 6) ? 0 : (diaSemanaVenta + 1);
    sabadoOrigen.setDate(sabadoOrigen.getDate() - diasRestar);

    const diffTiempo = pago - sabadoOrigen;
    const diffDias = Math.floor(diffTiempo / (1000 * 60 * 60 * 24));
    let semanasTranscurridas = Math.floor(diffDias / 7) + 1;

    return semanasTranscurridas < 1 ? 1 : semanasTranscurridas;
}

// --- 4. MOTOR FINANCIERO ---
function procesarCalculosAutomaticos() {
    const cliente = document.getElementById('cliente').value;
    const fechaVentaStr = document.getElementById('fechaVenta').value;
    const semanasPactadas = parseInt(document.getElementById('semanasPactadas').value) || 0;
    const pagoSemanal = parseFloat(document.getElementById('pagoSemanal').value) || 0;
    const precioContado = parseFloat(document.getElementById('precioContado').value) || 0;
    const pagadoAcumulado = parseFloat(document.getElementById('pagadoAcumulado').value) || 0;

    if (!fechaVentaStr || semanasPactadas <= 0) return;

    // Capturar fecha de hoy en huso horario de México automáticamente ('2026-08-18')
    const hoyStr = new Date().toISOString().split('T')[0];
    const semanasTranscurridas = calcularSemanasNegocio(fechaVentaStr, hoyStr);

    const totalCredito = semanasPactadas * pagoSemanal;
    const financiamientoTotal = totalCredito - precioContado;
    const saldoRegular = totalCredito - pagadoAcumulado;

    const financiamientoPorSemana = financiamientoTotal / semanasPactadas;
    const financiamientoDevengado = financiamientoPorSemana * semanasTranscurridas;
    
    const montoTeoricoAFecha = precioContado + financiamientoDevengado;
    let porPagarNeto = montoTeoricoAFecha - pagadoAcumulado;

    if (porPagarNeto < 0) porPagarNeto = 0;
    const descuentoOtorgado = saldoRegular - porPagarNeto;

    // Reflejar en pantalla de forma automática
    document.getElementById('calcSemanas').value = semanasTranscurridas;
    document.getElementById('calcSaldoRegular').value = saldoRegular.toFixed(2);
    document.getElementById('calcDescuento').value = descuentoOtorgado.toFixed(2);
    document.getElementById('calcNeto').value = porPagarNeto.toFixed(2);

    window.datosActuales = {
        cliente: cliente,
        saldoRegular: saldoRegular,
        descuento: descuentoOtorgado,
        neto: porPagarNeto,
        semana: semanasTranscurridas
    };
}

// --- 5. ENVIAR A WHATSAPP ---
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

    window.open(`https://wa.me{encodeURIComponent(mensaje)}`, '_blank');
}

// Escuchar eventos en pantalla
document.addEventListener('DOMContentLoaded', () => {
    procesarCalculosAutomaticos();
    document.querySelectorAll('.manual-input').forEach(input => {
        input.addEventListener('input', procesarCalculosAutomaticos);
    });
});
