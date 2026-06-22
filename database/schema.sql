-- ============================================================
--  Commerce Dashboard – MySQL Schema
--  Production-ready with indexes, constraints, and audit cols
-- ============================================================

CREATE DATABASE IF NOT EXISTS commerce_dashboard
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE commerce_dashboard;

-- ------------------------------------------------------------
-- users
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name     VARCHAR(120) NOT NULL,
    role          ENUM('admin','analyst','viewer') NOT NULL DEFAULT 'analyst',
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    last_login    DATETIME,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role  (role)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- categories
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(100) NOT NULL UNIQUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- products
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id  VARCHAR(20)  NOT NULL UNIQUE,
    name        VARCHAR(255) NOT NULL,
    category_id INT UNSIGNED NOT NULL,
    base_price  DECIMAL(12,2) NOT NULL DEFAULT 0,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
    INDEX idx_product_id  (product_id),
    INDEX idx_category    (category_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- customers
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_id   VARCHAR(20)  NOT NULL UNIQUE,
    customer_name VARCHAR(150) NOT NULL,
    first_seen    DATE,
    last_seen     DATE,
    total_orders  INT UNSIGNED NOT NULL DEFAULT 0,
    total_spent   DECIMAL(14,2) NOT NULL DEFAULT 0,
    segment       ENUM('New','Returning','VIP','At-Risk') DEFAULT 'New',
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_customer_id (customer_id),
    INDEX idx_segment     (segment)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- regions
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS regions (
    id     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name   VARCHAR(80) NOT NULL UNIQUE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- orders (fact table)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
    id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id       VARCHAR(20)   NOT NULL UNIQUE,
    order_date     DATE          NOT NULL,
    customer_id    INT UNSIGNED  NOT NULL,
    product_id     INT UNSIGNED  NOT NULL,
    quantity       SMALLINT UNSIGNED NOT NULL DEFAULT 1,
    unit_price     DECIMAL(12,2) NOT NULL,
    cost           DECIMAL(12,2) NOT NULL,
    revenue        DECIMAL(12,2) NOT NULL,
    profit         DECIMAL(12,2) NOT NULL,
    region_id      INT UNSIGNED  NOT NULL,
    state          VARCHAR(80)   NOT NULL,
    city           VARCHAR(80)   NOT NULL,
    payment_method VARCHAR(50)   NOT NULL,
    upload_batch   VARCHAR(50),
    created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    FOREIGN KEY (product_id)  REFERENCES products(id)  ON DELETE RESTRICT,
    FOREIGN KEY (region_id)   REFERENCES regions(id)   ON DELETE RESTRICT,
    INDEX idx_order_id   (order_id),
    INDEX idx_order_date (order_date),
    INDEX idx_customer   (customer_id),
    INDEX idx_product    (product_id),
    INDEX idx_region     (region_id),
    INDEX idx_state_city (state, city),
    INDEX idx_payment    (payment_method)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- upload_batches  (audit log for every CSV/Excel upload)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS upload_batches (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    batch_id      VARCHAR(50)  NOT NULL UNIQUE,
    file_name     VARCHAR(255) NOT NULL,
    file_size     INT UNSIGNED,
    total_rows    INT UNSIGNED NOT NULL DEFAULT 0,
    imported_rows INT UNSIGNED NOT NULL DEFAULT 0,
    skipped_rows  INT UNSIGNED NOT NULL DEFAULT 0,
    status        ENUM('processing','completed','failed') NOT NULL DEFAULT 'processing',
    error_log     TEXT,
    uploaded_by   INT UNSIGNED NOT NULL,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at  DATETIME,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_batch_id  (batch_id),
    INDEX idx_status    (status),
    INDEX idx_uploader  (uploaded_by)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- reports
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reports (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title       VARCHAR(255) NOT NULL,
    report_type ENUM('pdf','excel') NOT NULL,
    parameters  JSON,
    file_path   VARCHAR(500),
    generated_by INT UNSIGNED NOT NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_type      (report_type),
    INDEX idx_generated (generated_by)
) ENGINE=InnoDB;

-- ============================================================
--  Convenience views
-- ============================================================

CREATE OR REPLACE VIEW v_order_details AS
SELECT
    o.id,
    o.order_id,
    o.order_date,
    c.customer_id,
    c.customer_name,
    p.product_id,
    p.name          AS product_name,
    cat.name        AS category,
    o.quantity,
    o.unit_price    AS price,
    o.cost,
    o.revenue,
    o.profit,
    r.name          AS region,
    o.state,
    o.city,
    o.payment_method,
    o.upload_batch
FROM orders o
JOIN customers c  ON o.customer_id = c.id
JOIN products  p  ON o.product_id  = p.id
JOIN categories cat ON p.category_id = cat.id
JOIN regions   r  ON o.region_id   = r.id;

-- ============================================================
--  Seed default admin user  (password: Admin@123)
--  Hash generated with werkzeug.security.generate_password_hash
-- ============================================================
INSERT IGNORE INTO users (email, password_hash, full_name, role)
VALUES (
    'admin@dashboard.com',
    'pbkdf2:sha256:600000$PLACEHOLDER$HASH',  -- replaced at first run
    'Admin User',
    'admin'
);
