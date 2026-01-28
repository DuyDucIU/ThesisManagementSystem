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
                             ('ROLE_ADMIN'),
                             ('ROLE_LECTURER');

-- ================================================
-- TABLE: users
-- ================================================
CREATE TABLE users (
                       id BIGINT PRIMARY KEY AUTO_INCREMENT,

                       username VARCHAR(100) NOT NULL UNIQUE,
                       full_name VARCHAR(150) NOT NULL,
                       password VARCHAR(255) NOT NULL

);

INSERT INTO users (username, password, full_name) VALUES
                                ('admin',
                               '$2a$10$VhZhCOcfaRISY6Q6DnI9SOjV0HPSusi8DtB621/aeRXP5fPqFe0Ae',
                               'Admin'
                               ),
                                ('testlecturer',
                               '$2a$10$21Mm//OVRwt9NieZeJEFB.41pTLVyYiTMLdAL8ckXRDFcSumys0.O',
                               'Test Lecturer'
                               );

-- ================================================
-- JOIN TABLE: users_roles
-- ================================================
CREATE TABLE users_roles (
                            user_id BIGINT NOT NULL,
                            role_id BIGINT NOT NULL,

                            PRIMARY KEY (user_id, role_id),

                            CONSTRAINT fk_ur_user
                                FOREIGN KEY (user_id)
                                    REFERENCES users(id)
                                    ON DELETE CASCADE,

                            CONSTRAINT fk_ur_role
                                FOREIGN KEY (role_id)
                                    REFERENCES roles(id)
                                    ON DELETE CASCADE
);

INSERT INTO users_roles (user_id, role_id)
VALUES
    (1, (SELECT id FROM roles WHERE name = 'ROLE_ADMIN')),
    (1, (SELECT id FROM roles WHERE name = 'ROLE_LECTURER')),
    (2, (SELECT id FROM roles WHERE name = 'ROLE_LECTURER'));

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

