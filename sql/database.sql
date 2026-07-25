SET NAMES utf8mb4;
SET time_zone = '-06:00';

CREATE TABLE IF NOT EXISTS roles (
    id_rol INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    descripcion VARCHAR(200) NULL,
    estado TINYINT(1) NOT NULL DEFAULT 1,
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_roles_nombre UNIQUE (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre_completo VARCHAR(150) NOT NULL,
    nombre_usuario VARCHAR(80) NOT NULL,
    correo VARCHAR(150) NULL,
    password_hash VARCHAR(255) NOT NULL,
    id_rol INT UNSIGNED NOT NULL,
    estado TINYINT(1) NOT NULL DEFAULT 1,
    ultimo_acceso DATETIME NULL,
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_usuarios_nombre_usuario UNIQUE (nombre_usuario),
    CONSTRAINT uq_usuarios_correo UNIQUE (correo),
    CONSTRAINT fk_usuarios_roles FOREIGN KEY (id_rol)
        REFERENCES roles(id_rol)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS categorias (
    id_categoria INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    slug VARCHAR(130) NOT NULL,
    descripcion VARCHAR(300) NULL,
    imagen_url VARCHAR(600) NULL,
    imagen_public_id VARCHAR(255) NULL,
    estado TINYINT(1) NOT NULL DEFAULT 1,
    activo TINYINT(1) NOT NULL DEFAULT 1,
    orden_visual INT NOT NULL DEFAULT 0,
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_categorias_nombre UNIQUE (nombre),
    CONSTRAINT uq_categorias_slug UNIQUE (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS productos (
    id_producto INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(50) NOT NULL,
    nombre VARCHAR(160) NOT NULL,
    slug VARCHAR(190) NOT NULL,
    id_categoria INT UNSIGNED NOT NULL,
    descripcion_corta VARCHAR(350) NULL,
    descripcion_completa TEXT NULL,
    precio_venta DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    precio_anterior DECIMAL(12,2) NULL,
    stock_actual INT UNSIGNED NOT NULL DEFAULT 0,
    stock_minimo INT UNSIGNED NOT NULL DEFAULT 0,
    unidad_medida ENUM('Unidad','Paquete','Caja','Par','Docena') NOT NULL DEFAULT 'Unidad',
    marca VARCHAR(100) NULL,
    color_estilo VARCHAR(120) NULL,
    material VARCHAR(120) NULL,
    personalizable TINYINT(1) NOT NULL DEFAULT 0,
    estado_disponibilidad ENUM('Disponible','Agotado','Proximamente','Descontinuado') NOT NULL DEFAULT 'Disponible',
    estado_publicacion ENUM('Publicado','Oculto') NOT NULL DEFAULT 'Publicado',
    destacado TINYINT(1) NOT NULL DEFAULT 0,
    activo TINYINT(1) NOT NULL DEFAULT 1,
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_productos_codigo UNIQUE (codigo),
    CONSTRAINT uq_productos_slug UNIQUE (slug),
    CONSTRAINT chk_productos_precios CHECK (precio_venta >= 0 AND (precio_anterior IS NULL OR precio_anterior >= 0)),
    CONSTRAINT fk_productos_categorias FOREIGN KEY (id_categoria)
        REFERENCES categorias(id_categoria)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS producto_imagenes (
    id_imagen INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_producto INT UNSIGNED NOT NULL,
    imagen_url VARCHAR(600) NOT NULL,
    imagen_public_id VARCHAR(255) NOT NULL,
    texto_alternativo VARCHAR(180) NULL,
    es_principal TINYINT(1) NOT NULL DEFAULT 0,
    orden_visual INT NOT NULL DEFAULT 0,
    activo TINYINT(1) NOT NULL DEFAULT 1,
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_producto_imagen_public_id UNIQUE (imagen_public_id),
    CONSTRAINT fk_producto_imagenes_productos FOREIGN KEY (id_producto)
        REFERENCES productos(id_producto)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS movimientos_inventario (
    id_movimiento BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_producto INT UNSIGNED NOT NULL,
    tipo_movimiento ENUM('Entrada','Salida','Ajuste positivo','Ajuste negativo','Devolucion','Correccion','Stock inicial') NOT NULL,
    cantidad INT UNSIGNED NOT NULL,
    stock_anterior INT UNSIGNED NOT NULL,
    stock_nuevo INT UNSIGNED NOT NULL,
    motivo VARCHAR(350) NOT NULL,
    referencia VARCHAR(120) NULL,
    id_usuario INT UNSIGNED NOT NULL,
    fecha_movimiento DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_movimiento_cantidad CHECK (cantidad > 0),
    CONSTRAINT fk_movimientos_productos FOREIGN KEY (id_producto)
        REFERENCES productos(id_producto)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_movimientos_usuarios FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS configuracion_negocio (
    id_configuracion TINYINT UNSIGNED PRIMARY KEY,
    nombre_negocio VARCHAR(160) NOT NULL,
    descripcion VARCHAR(600) NULL,
    logo_url VARCHAR(600) NULL,
    logo_public_id VARCHAR(255) NULL,
    portada_url VARCHAR(600) NULL,
    portada_public_id VARCHAR(255) NULL,
    telefono VARCHAR(30) NULL,
    whatsapp VARCHAR(30) NULL,
    correo VARCHAR(150) NULL,
    direccion VARCHAR(350) NULL,
    mapa_url VARCHAR(600) NULL,
    facebook VARCHAR(300) NULL,
    instagram VARCHAR(300) NULL,
    moneda CHAR(3) NOT NULL DEFAULT 'CRC',
    mostrar_stock_publico TINYINT(1) NOT NULL DEFAULT 0,
    mensaje_bienvenida VARCHAR(600) NULL,
    mensaje_inferior VARCHAR(350) NULL,
    fecha_actualizacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_configuracion_unica CHECK (id_configuracion = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_productos_categoria ON productos(id_categoria);
CREATE INDEX idx_productos_publico ON productos(activo, estado_publicacion, estado_disponibilidad);
CREATE INDEX idx_productos_destacados ON productos(destacado, activo, estado_publicacion);
CREATE INDEX idx_productos_stock ON productos(stock_actual, stock_minimo);
CREATE INDEX idx_imagenes_producto ON producto_imagenes(id_producto, activo, es_principal, orden_visual);
CREATE INDEX idx_movimientos_producto_fecha ON movimientos_inventario(id_producto, fecha_movimiento);
CREATE INDEX idx_movimientos_usuario_fecha ON movimientos_inventario(id_usuario, fecha_movimiento);
