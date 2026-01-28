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
                       full_name VARCHAR(150) NOT NULL,
                       password VARCHAR(255) NOT NULL,

                       role_id BIGINT NOT NULL,

                       CONSTRAINT fk_users_role
                           FOREIGN KEY (role_id)
                               REFERENCES roles(id)

);

INSERT INTO users (username, password, full_name, role_id) VALUES
                                ('admin',
                               '$2a$10$VhZhCOcfaRISY6Q6DnI9SOjV0HPSusi8DtB621/aeRXP5fPqFe0Ae',
                               'Admin',
                               (SELECT id FROM roles WHERE name = 'ADMIN')
                               ),
                                ('testlecturer',
                               '$2a$10$21Mm//OVRwt9NieZeJEFB.41pTLVyYiTMLdAL8ckXRDFcSumys0.O',
                               'Admin',
                               (SELECT id FROM roles WHERE name = 'LECTURER')
                               );

-- ================================================
-- TABLE: users
-- ================================================
CREATE TABLE students (
                          id BIGINT PRIMARY KEY AUTO_INCREMENT,

                          student_id VARCHAR(50) NOT NULL UNIQUE,
                          full_name VARCHAR(150) NOT NULL,

                          managed_by BIGINT NULL,

                          CONSTRAINT fk_students_lecturer
                              FOREIGN KEY (managed_by)
                                  REFERENCES users(id)
);

