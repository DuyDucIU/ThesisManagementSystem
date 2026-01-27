-- ================================================
-- THESIS MANAGEMENT SYSTEM DATABASE SCHEMA
-- ================================================

-- ================================================
-- TABLE: roles
-- ================================================
CREATE TABLE roles (
                       id BIGINT PRIMARY KEY AUTO_INCREMENT,
                       name VARCHAR(50) NOT NULL UNIQUE
);

INSERT INTO roles (name) VALUES
                             ('ADMIN'),
                             ('LECTURER');

-- ================================================
-- TABLE: users
-- ================================================
CREATE TABLE users (
                       id BIGINT PRIMARY KEY AUTO_INCREMENT,

                       username VARCHAR(100) NOT NULL UNIQUE,
                       password VARCHAR(255) NOT NULL,
                       full_name VARCHAR(150) NOT NULL,

                       role_id BIGINT NOT NULL,

                       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                       CONSTRAINT fk_users_role
                           FOREIGN KEY (role_id)
                               REFERENCES roles(id)
);

-- ================================================
-- TABLE: users
-- ================================================
CREATE TABLE students (
                          id BIGINT PRIMARY KEY AUTO_INCREMENT,

                          student_id VARCHAR(50) NOT NULL UNIQUE,
                          full_name VARCHAR(150) NOT NULL,

                          managed_by BIGINT NULL,

                          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                          CONSTRAINT fk_students_lecturer
                              FOREIGN KEY (managed_by)
                                  REFERENCES users(id)
);

