INSERT INTO roles (nombre, descripcion, estado)
SELECT 'Administrador', 'Acceso completo al sistema', 1
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE nombre = 'Administrador');

INSERT INTO categorias (nombre, slug, descripcion, orden_visual)
SELECT 'Pulseras', 'pulseras', 'Pulseras artesanales y de bisutería', 1
WHERE NOT EXISTS (SELECT 1 FROM categorias WHERE slug = 'pulseras');

INSERT INTO categorias (nombre, slug, descripcion, orden_visual)
SELECT 'Collares', 'collares', 'Collares y cadenas', 2
WHERE NOT EXISTS (SELECT 1 FROM categorias WHERE slug = 'collares');

INSERT INTO categorias (nombre, slug, descripcion, orden_visual)
SELECT 'Aretes', 'aretes', 'Aretes artesanales y accesorios', 3
WHERE NOT EXISTS (SELECT 1 FROM categorias WHERE slug = 'aretes');

INSERT INTO categorias (nombre, slug, descripcion, orden_visual)
SELECT 'Anillos', 'anillos', 'Anillos y piezas ajustables', 4
WHERE NOT EXISTS (SELECT 1 FROM categorias WHERE slug = 'anillos');

INSERT INTO categorias (nombre, slug, descripcion, orden_visual)
SELECT 'Conjuntos', 'conjuntos', 'Conjuntos de collar, pulsera o aretes', 5
WHERE NOT EXISTS (SELECT 1 FROM categorias WHERE slug = 'conjuntos');

INSERT INTO categorias (nombre, slug, descripcion, orden_visual)
SELECT 'Otros', 'otros', 'Otros productos de bisutería', 99
WHERE NOT EXISTS (SELECT 1 FROM categorias WHERE slug = 'otros');

INSERT INTO configuracion_negocio (
  id_configuracion, nombre_negocio, descripcion, telefono, whatsapp,
  moneda, mostrar_stock_publico, mensaje_bienvenida, mensaje_inferior
)
VALUES (
  1, 'Accesorios Anny', 'Bisutería y accesorios hechos con dedicación',
  '85548880', '50685548880', 'CRC', 0,
  'Descubre nuestros accesorios y consulta otros estilos por WhatsApp.',
  'Gracias por apoyar nuestro emprendimiento.'
)
ON DUPLICATE KEY UPDATE nombre_negocio = VALUES(nombre_negocio);
