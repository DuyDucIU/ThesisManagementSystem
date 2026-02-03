ALTER TABLE students
    ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'VALID',
    ADD COLUMN invalid_reason VARCHAR(255) NULL;

CREATE INDEX idx_students_status ON students(status);
