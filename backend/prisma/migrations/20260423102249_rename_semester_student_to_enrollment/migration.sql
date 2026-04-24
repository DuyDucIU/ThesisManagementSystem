-- Drop FK from theses pointing at semester_students
ALTER TABLE `theses` DROP FOREIGN KEY `theses_semester_student_id_fkey`;

-- Rename column on theses
ALTER TABLE `theses` RENAME COLUMN `semester_student_id` TO `enrollment_id`;

-- Rename table
ALTER TABLE `semester_students` RENAME TO `enrollments`;

-- Re-add FK with new name
ALTER TABLE `theses`
  ADD CONSTRAINT `theses_enrollment_id_fkey`
  FOREIGN KEY (`enrollment_id`) REFERENCES `enrollments`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Rename indexes
ALTER TABLE `enrollments`
  RENAME INDEX `semester_students_student_id_semester_id_key`
  TO `enrollments_student_id_semester_id_key`;
ALTER TABLE `theses`
  RENAME INDEX `theses_semester_student_id_key`
  TO `theses_enrollment_id_key`;
