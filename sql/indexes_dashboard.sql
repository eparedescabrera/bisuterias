-- Índices adicionales Documento 7 (idempotente donde MySQL lo permita)
-- Ejecutar manualmente en Railway si aún no existen.

CREATE INDEX IF NOT EXISTS idx_movimientos_tipo_fecha
  ON movimientos_inventario (tipo_movimiento, fecha_movimiento);

CREATE INDEX IF NOT EXISTS idx_movimientos_fecha
  ON movimientos_inventario (fecha_movimiento);

CREATE INDEX IF NOT EXISTS idx_productos_activo_stock
  ON productos (activo, stock_actual, stock_minimo);
