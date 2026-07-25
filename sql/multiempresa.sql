-- Multiempresa + suscripciones SINPE (migración)
SET NAMES utf8mb4;
SET time_zone = '-06:00';

-- Roles
INSERT INTO roles (nombre, descripcion, estado)
SELECT 'SuperAdministrador', 'Propietario de la plataforma (sin empresa)', 1
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE nombre = 'SuperAdministrador');

INSERT INTO roles (nombre, descripcion, estado)
SELECT 'Administrador', 'Administrador de un negocio', 1
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE nombre = 'Administrador');

-- Empresas
CREATE TABLE IF NOT EXISTS empresas (
  id_empresa INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre_negocio VARCHAR(160) NOT NULL,
  slug VARCHAR(180) NOT NULL,
  propietario VARCHAR(150) NOT NULL,
  telefono VARCHAR(30) NOT NULL,
  correo VARCHAR(150) NOT NULL,
  direccion VARCHAR(350) NULL,
  logo_url VARCHAR(600) NULL,
  logo_public_id VARCHAR(255) NULL,
  plan ENUM('Mensual','Trimestral','Anual') NOT NULL DEFAULT 'Mensual',
  estado ENUM('Pendiente','Activa','Suspendida','Vencida') NOT NULL DEFAULT 'Pendiente',
  fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_vencimiento DATE NULL,
  observaciones VARCHAR(600) NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  CONSTRAINT uq_empresas_slug UNIQUE (slug),
  CONSTRAINT uq_empresas_correo UNIQUE (correo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS suscripciones (
  id_suscripcion INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_empresa INT UNSIGNED NOT NULL,
  monto DECIMAL(12,2) NOT NULL,
  metodo_pago ENUM('SINPE') NOT NULL DEFAULT 'SINPE',
  fecha_pago DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  estado ENUM('Pendiente','Aceptada','Rechazada','Vencida') NOT NULL DEFAULT 'Aceptada',
  id_comprobante INT UNSIGNED NULL,
  observaciones VARCHAR(600) NULL,
  fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_suscripciones_empresa FOREIGN KEY (id_empresa)
    REFERENCES empresas(id_empresa) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS comprobantes (
  id_comprobante INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_empresa INT UNSIGNED NOT NULL,
  imagen_url VARCHAR(600) NOT NULL,
  imagen_public_id VARCHAR(255) NOT NULL,
  monto_declarado DECIMAL(12,2) NULL,
  fecha_envio DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  observaciones VARCHAR(600) NULL,
  estado ENUM('Pendiente','Aceptado','Rechazado') NOT NULL DEFAULT 'Pendiente',
  revisado_por INT UNSIGNED NULL,
  fecha_revision DATETIME NULL,
  CONSTRAINT fk_comprobantes_empresa FOREIGN KEY (id_empresa)
    REFERENCES empresas(id_empresa) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Índices (ignorar error si ya existen al re-ejecutar)
-- CREATE INDEX idx_empresas_estado ON empresas(estado, activo);
-- CREATE INDEX idx_suscripciones_empresa ON suscripciones(id_empresa, fecha_fin);
-- CREATE INDEX idx_comprobantes_empresa ON comprobantes(id_empresa, estado, fecha_envio);
