/** Planes de suscripción (SINPE manual). Montos en CRC. */
export const PLANES = {
  Mensual: { dias: 30, monto: 15000, label: 'Mensual' },
  Trimestral: { dias: 90, monto: 40000, label: 'Trimestral' },
  Anual: { dias: 365, monto: 140000, label: 'Anual' }
};

export const SINPE_NUMERO = '8554-8880';

export function getPlan(plan) {
  const p = PLANES[plan];
  if (!p) return null;
  return { plan, ...p };
}

export function listPlanes() {
  return Object.entries(PLANES).map(([plan, meta]) => ({
    plan,
    ...meta,
    metodo_pago: 'SINPE'
  }));
}

export default { PLANES, SINPE_NUMERO, getPlan, listPlanes };
