export const t = {
  app: {
    nombre: 'Nexpak',
    slogan: 'Rastreo de envíos internacionales',
  },

  rastreo: {
    titulo: 'Rastrea tu envío',
    descripcion: 'Ingresa tu número de guía para ver el estado de tu envío en tiempo real.',
    placeholder: 'NXP-XXXXXXX',
    botonRastrear: 'Rastrear envío',
    guiaInvalida: 'Revisa el número de guía, parece tener un error de digitación.',
    noEncontrado: 'No encontramos esa guía.',
    noEncontradoDetalle: 'Verifica el número o contacta a Nexpak.',
    estadoActual: 'Estado actual',
    fechaEstimada: 'Entrega estimada',
    origen: 'Origen',
    destino: 'Destino',
    destinatario: 'Para',
    servicio: 'Servicio',
    historial: 'Historial de seguimiento',
    servicioEstandar: 'Estándar',
    servicioExpress: 'Express',

    // Inicio - Cómo funciona
    comoFuncionaTitulo: '¿Cómo funciona?',
    paso1Titulo: 'Ingresa tu guía',
    paso1Desc: 'Escribe el número de guía que te dimos al recibir tu paquete.',
    paso2Titulo: 'Consultamos tu envío',
    paso2Desc: 'Buscamos el estado actualizado de tu paquete en tiempo real.',
    paso3Titulo: 'Infórmate al instante',
    paso3Desc: 'Ve cada etapa del trayecto y recibe actualizaciones automáticas.',

    // Resultado
    copiarGuia: 'Copiar guía',
    compartir: 'Compartir',
    guiaCopiada: '¡Guía copiada!',
    enlaceCopiado: '¡Enlace copiado!',
    enVivo: 'En vivo',
    actualizadoHace: (tiempo: string) => `Actualizado ${tiempo}`,

    // Banner excepción
    bannerExcepcionTitulo: 'Hay una novedad con tu envío',
    bannerExcepcionTexto:
      'Nuestro equipo está trabajando para resolver esta situación. No dudes en contactarnos.',
    contactarNexpak: 'Contactar a Nexpak',

    // Error / no encontrado
    errorConexion: 'Sin conexión. Verifica tu internet.',
    reintentar: 'Reintentar',
    volverBuscar: 'Buscar otra guía',

    // SEO
    seoTituloInicio: 'Rastreo de envíos · Nexpak',
    seoDescInicio:
      'Rastrea tu envío con Nexpak. Ingresa tu número de guía para ver el estado en tiempo real.',
    seoTituloResultado: (guia: string) => `Guía ${guia} · Nexpak`,
    seoDescResultado: (guia: string) =>
      `Consulta el estado actual del envío ${guia} y el historial de seguimiento.`,
  },

  pie: {
    contacto: 'Contacto',
    direccion: '[DIRECCIÓN]',
    telefono: '[TELÉFONO]',
    correo: '[CORREO]',
    derechos: (year: number) => `© ${year} Nexpak. Todos los derechos reservados.`,
  },

  auth: {
    tituloLogin: 'Acceso administradores',
    email: 'Correo electrónico',
    contrasena: 'Contraseña',
    botonIngresar: 'Ingresar',
    cerrarSesion: 'Cerrar sesión',
    cargando: 'Ingresando…',
    errorCredenciales: 'Correo o contraseña incorrectos.',
    errorDemasiadosIntentos: 'Demasiados intentos. Espera unos minutos e intenta de nuevo.',
    errorSinConexion: 'Sin conexión. Verifica tu internet e intenta de nuevo.',
    sinAcceso: 'Tu cuenta no tiene acceso al panel.',
    sinAccesoDetalle: 'Comunícate con el administrador para activar tu cuenta.',
    errorPerfil: 'No se pudo cargar tu perfil.',
    errorPerfilDetalle: 'Verifica tu conexión e intenta de nuevo.',
    reintentar: 'Reintentar',
  },

  nav: {
    resumen: 'Resumen',
    envios: 'Envíos',
    nuevoEnvio: 'Nuevo envío',
  },

  dashboard: {
    titulo: 'Resumen',
    enCurso: 'En curso',
    transitoInternacional: 'En tránsito',
    enAduana: 'En aduana',
    conNovedad: 'Con novedad',
    entregados30d: 'Entregados (30d)',
    creadosHoy: 'Creados hoy',
    distribucionEstados: 'Distribución por estado',
    requierenAtencion: 'Requieren atención',
    ultimosMovimientos: 'Últimos movimientos',
    motivoExcepcion: 'Excepción',
    motivoEstancado: (n: number) => `${n} ${n === 1 ? 'día' : 'días'} sin movimiento`,
    sinDatos: 'No hay datos disponibles aún.',
    sinAtencion: 'No hay envíos que requieran atención.',
    sinMovimientos: 'No hay movimientos recientes.',
    cargandoResumen: 'Cargando resumen…',
    errorResumen: 'Error al cargar el resumen.',
    verListado: 'Ver listado',
  },

  envios: {
    titulo: 'Envíos',
    nuevo: 'Nuevo envío',
    buscarPlaceholder: 'Buscar por guía o destinatario…',
    sinResultados: 'No se encontraron envíos',
    sinEnvios: 'Aún no hay envíos registrados',
    sinEnviosBoton: 'Registrar primer envío',
    filtroTodos: 'Todos los estados',
    filtroExcepciones: 'Solo con novedades',
    paginaAnterior: 'Anterior',
    paginaSiguiente: 'Siguiente',
    mostrandoTotal: (inicio: number, fin: number, total: number) =>
      `Mostrando ${inicio}–${fin} de ${total}`,
    columnaGuia: 'Guía',
    columnaDestinatario: 'Destinatario',
    columnaDestino: 'Destino',
    columnaEstado: 'Estado',
    columnaServicio: 'Servicio',
    columnaFecha: 'Creado',
    verDetalle: 'Ver detalle',

    exitoTitulo: 'Envío registrado',
    exitoSubtitulo: 'La guía fue asignada automáticamente',
    exitoCopiar: 'Copiar guía',
    exitoCopiado: '¡Copiado!',
    exitoVerEnvio: 'Ver envío',
    exitoCrearOtro: 'Crear otro envío',
    exitoIrListado: 'Ver todos los envíos',

    detalleRemitente: 'Remitente',
    detalleDestinatario: 'Destinatario',
    detallePaquete: 'Paquete',
    detalleServicio: 'Servicio',
    detalleHistorial: 'Historial',
    detalleNotaInterna: 'Nota interna',
    detalleNoEncontrado: 'No se encontró este envío',
    detalleVolver: 'Volver al listado',
    detalleTituloEditar: 'Editar envío',

    // Inactivar
    inactivarTitulo: 'Inactivar envío',
    inactivarAdvertencia:
      'El envío quedará inactivo y no podrá editarse ni actualizarse hasta ser reactivado. El registro no se elimina.',
    inactivarMotivoLabel: 'Motivo',
    inactivarMotivoPlaceholder: 'Describe el motivo de inactivación…',
    inactivarConfirmarBoton: 'Inactivar envío',
    inactivarCargando: 'Inactivando…',
    motivosInactivar: [
      'Registro duplicado',
      'Error de digitación',
      'Cancelado por el cliente',
      'Envío de prueba',
      'Otro',
    ],
    toastInactivado: 'Envío inactivado',
    toastDeshacer: 'Deshacer',
    toastReactivado: 'Envío reactivado',

    // Reactivar
    reactivarTitulo: 'Reactivar envío',
    reactivarConfirmar: '¿Reactivar este envío? Volverá a ser editable y actualizable.',
    reactivarBoton: 'Reactivar',
    reactivarCargando: 'Reactivando…',

    bannnerInactivo: (fecha: string, nombre: string, motivo: string) =>
      `Inactivado el ${fecha} por ${nombre} · Motivo: ${motivo}`,

    filtroActivos: 'Solo activos',
    filtroInactivos: 'Inactivos',
    filtroTodosActividad: 'Todos',
    etiquetaInactivo: 'Inactivo',

    datosFaltantes: (campos: string[]) =>
      `Este envío tiene datos incompletos: ${campos.join(', ')}`,
    borradorDisponible: 'Tienes cambios sin guardar de una edición anterior.',
    borradorRestaurar: 'Restaurar',
    borradorDescartar: 'Descartar',

    // Rótulo
    imprimirRotulo: 'Imprimir rótulo',
    imprimirRotulos: 'Imprimir rótulos',
    generandoRotulo: 'Generando PDF…',

    formulario: {
      tituloNuevo: 'Registrar nuevo envío',
      tituloEditar: 'Editar envío',
      seccionRemitente: 'Remitente',
      seccionDestinatario: 'Destinatario',
      seccionPaquete: 'Paquete',
      seccionServicio: 'Servicio',
      nombre: 'Nombre',
      telefono: 'Teléfono',
      email: 'Correo electrónico',
      direccion: 'Dirección',
      pais: 'País',
      ciudad: 'Ciudad',
      documento: 'Documento de identidad',
      descripcion: 'Descripción del contenido',
      peso: 'Peso (kg)',
      largo: 'Largo (cm)',
      ancho: 'Ancho (cm)',
      alto: 'Alto (cm)',
      valorDeclarado: 'Valor declarado',
      moneda: 'Moneda',
      tipoServicio: 'Tipo de servicio',
      servicioEstandar: 'Estándar',
      servicioExpress: 'Express',
      fechaEstimada: 'Fecha estimada de entrega',
      botonGuardar: 'Registrar envío',
      botonGuardarCambios: 'Guardar cambios',
      botonCancelar: 'Cancelar',
      cargando: 'Registrando…',
      cargandoEdicion: 'Guardando cambios…',
      error: 'Ocurrió un error. Verifica los datos e intenta de nuevo.',
      buscarPais: 'Buscar país…',
      paisesFrecuentes: 'Frecuentes',
      todosLosPaises: 'Todos los países',
      sinResultadosPais: 'No se encontraron países',
      seleccionarPais: 'Seleccionar país',
    },
  },

  eventos: {
    titulo: 'Historial',
    actualizarEstado: 'Actualizar estado',
    editarEvento: 'Editar evento',
    nuevoEstado: 'Nuevo estado',
    estadoSugerido: 'Siguiente sugerido',
    flujoNormal: 'Flujo normal',
    excepciones: 'Excepciones',
    ubicacion: 'Ubicación',
    ubicacionPlaceholder: 'Ej. Miami, EE. UU.',
    notaPublica: 'Nota para el cliente',
    notaPublicaPlaceholder: 'Visible para el destinatario…',
    notaInterna: 'Nota interna (solo staff)',
    notaInternaPlaceholder: 'No la ve el cliente…',
    fechaHora: 'Fecha y hora del evento',
    botonGuardar: 'Guardar cambio',
    botonGuardarEdicion: 'Guardar edición',
    cargando: 'Guardando…',
    exito: 'Estado actualizado',
    exitoEdicion: 'Evento actualizado',
    error: 'Error al actualizar el estado',

    // Confirmaciones en PanelEstado
    confirmarRetroceso: (estadoActual: string, estadoNuevo: string) =>
      `El estado "${estadoNuevo}" es anterior al actual "${estadoActual}". ¿Confirmas el retroceso?`,
    confirmarEstadoFinal: (estadoActual: string) =>
      `El envío ya está en "${estadoActual}". ¿Agregar otro evento de todas formas?`,
    confirmarEntregado: '¿Confirmas que el paquete fue entregado al destinatario?',

    // Anulación
    anularTitulo: 'Anular evento',
    anularAdvertencia:
      'El evento quedará anulado y no se mostrará al cliente.',
    anularMotivoLabel: 'Motivo',
    anularMotivoPlaceholder: 'Describe el motivo de anulación…',
    anularBoton: 'Anular evento',
    anularCargando: 'Anulando…',
    motivosAnular: [
      'Estado registrado por error',
      'Fecha incorrecta',
      'Envío equivocado',
      'Otro',
    ],

    // Historial
    eventoAnulado: (nombre: string, motivo: string) =>
      `Anulado por ${nombre} · ${motivo}`,
    eventoEditado: 'editado',
    menuEditar: 'Editar',
    menuAnular: 'Anular',

    // Barra acciones masivas
    seleccionados: (n: number) => `${n} ${n === 1 ? 'envío' : 'envíos'} seleccionado${n === 1 ? '' : 's'}`,
    actualizarMasivo: 'Actualizar estado',
    limpiarSeleccion: 'Limpiar selección',
    resultadoMasivo: (act: number, om: number) =>
      `${act} ${act === 1 ? 'envío actualizado' : 'envíos actualizados'}${om > 0 ? `, ${om} omitido${om === 1 ? '' : 's'}` : ''}`,

    // Plantillas de nota pública por estado
    plantillas: {
      guia_generada: 'Tu envío ha sido registrado en nuestro sistema.',
      recibido_origen: 'Tu paquete fue recibido en nuestra bodega de origen.',
      transito_internacional: 'Tu paquete está en tránsito internacional.',
      en_aduana: 'Tu paquete está siendo procesado en aduana.',
      liberado_aduana: 'Tu paquete fue liberado de aduana.',
      centro_distribucion: 'Tu paquete llegó al centro de distribución.',
      en_reparto: 'Tu paquete está en camino para ser entregado hoy.',
      entregado: 'Tu paquete fue entregado con éxito. ¡Gracias por elegirnos!',
      novedad: 'Tu envío presenta una novedad. Nos comunicaremos contigo a la brevedad.',
      retenido_aduana:
        'Tu paquete está retenido en aduana. Te contactaremos con más información.',
      intento_fallido:
        'Se realizó un intento de entrega sin éxito. Coordinaremos una nueva fecha.',
      devuelto: 'Tu paquete fue devuelto al remitente de origen.',
    } as Record<string, string>,
  },

  errores: {
    campoRequerido: 'Este campo es requerido',
    emailInvalido: 'Ingresa un correo válido',
    numeroInvalido: 'Debe ser un número válido',
    servidorError: 'Error del servidor, intenta de nuevo',
  },

  comun: {
    cargando: 'Cargando…',
    guardar: 'Guardar',
    cancelar: 'Cancelar',
    editar: 'Editar',
    eliminar: 'Eliminar',
    confirmar: 'Confirmar',
    volver: 'Volver',
    si: 'Sí',
    no: 'No',
    copiar: 'Copiar',
    copiado: '¡Copiado!',
    noAplica: '—',
    cerrar: 'Cerrar',
    seleccionarTodos: 'Seleccionar todos',
  },

  pagina404: {
    titulo: 'Página no encontrada',
    mensaje: 'La página que buscas no existe o fue movida.',
    botonInicio: 'Ir al inicio',
    botonRastrear: 'Rastrear envío',
  },
}
