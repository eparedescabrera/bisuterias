/**
 * Zona horaria America/Costa_Rica.
 * Tipos Doc 2 (no ENTRADA/SALIDA en inglés).
 */
export const TZ = 'America/Costa_Rica';

export const TIPOS_ENTRADA = [
  'Entrada',
  'Ajuste positivo',
  'Devolucion',
  'Stock inicial'
];

export const TIPOS_SALIDA = ['Salida', 'Ajuste negativo'];

export const TIPOS_AJUSTE = [
  'Ajuste positivo',
  'Ajuste negativo',
  'Correccion'
];

function pad(n) {
  return String(n).padStart(2, '0');
}

/** Fecha local CR YYYY-MM-DD */
export function todayCR() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

export function formatDateCR(date = new Date()) {
  return new Intl.DateTimeFormat('es-CR', {
    timeZone: TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
}

/**
 * Resuelve período Doc 7.
 * @returns {{ desde: string, hasta: string, desdeDT: string, hastaDT: string, label: string }}
 */
export function resolvePeriodo(query = {}) {
  const hoy = todayCR();
  let desde = query.desde;
  let hasta = query.hasta;
  let label = 'Personalizado';

  const periodo = query.periodo;

  if (periodo === 'hoy') {
    desde = hoy;
    hasta = hoy;
    label = 'Hoy';
  } else if (periodo === '7dias' || periodo === 'semana') {
    const d = new Date(`${hoy}T12:00:00-06:00`);
    d.setDate(d.getDate() - 6);
    desde = d.toISOString().slice(0, 10);
    hasta = hoy;
    label = 'Últimos 7 días';
  } else if (periodo === 'mes') {
    desde = `${hoy.slice(0, 8)}01`;
    hasta = hoy;
    label = 'Este mes';
  } else if (periodo === 'mes_anterior') {
    const d = new Date(`${hoy}T12:00:00-06:00`);
    d.setDate(1);
    d.setMonth(d.getMonth() - 1);
    const y = d.getFullYear();
    const m = pad(d.getMonth() + 1);
    desde = `${y}-${m}-01`;
    const last = new Date(y, d.getMonth() + 1, 0).getDate();
    hasta = `${y}-${m}-${pad(last)}`;
    label = 'Mes anterior';
  } else if (periodo === 'anio' || periodo === 'año') {
    desde = `${hoy.slice(0, 4)}-01-01`;
    hasta = hoy;
    label = 'Este año';
  } else if (!desde || !hasta) {
    desde = `${hoy.slice(0, 8)}01`;
    hasta = hoy;
    label = 'Este mes';
  }

  return {
    desde,
    hasta,
    desdeDT: `${desde} 00:00:00`,
    hastaDT: `${hasta} 23:59:59`,
    label
  };
}

/** Período anterior de la misma duración (días) */
export function previousPeriod(desde, hasta) {
  const start = new Date(`${desde}T12:00:00-06:00`);
  const end = new Date(`${hasta}T12:00:00-06:00`);
  const days = Math.max(1, Math.round((end - start) / 86400000) + 1);
  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - (days - 1));
  const a = prevStart.toISOString().slice(0, 10);
  const b = prevEnd.toISOString().slice(0, 10);
  return {
    desde: a,
    hasta: b,
    desdeDT: `${a} 00:00:00`,
    hastaDT: `${b} 23:59:59`
  };
}

export function pctChange(current, previous) {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

export function formatCRC(value) {
  return new Intl.NumberFormat('es-CR', {
    style: 'currency',
    currency: 'CRC',
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}
