CREATE TABLE semester (
                          id BIGINT PRIMARY KEY AUTO_INCREMENT,

                          code VARCHAR(20) NOT NULL UNIQUE,        -- VD: S2_2025-26
                          name VARCHAR(150) NOT NULL,              -- VD: Semester 1 2025-26

                          start_date DATE NOT NULL,
                          end_date DATE NOT NULL,

                          status VARCHAR(20) NOT NULL DEFAULT 'UPCOMING',
    -- UPCOMING | ACTIVE | CLOSED

                          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                              ON UPDATE CURRENT_TIMESTAMP
);

-- Optional indexes
CREATE INDEX idx_semester_status ON semester(status);
CREATE INDEX idx_semester_date ON semester(start_date, end_date);