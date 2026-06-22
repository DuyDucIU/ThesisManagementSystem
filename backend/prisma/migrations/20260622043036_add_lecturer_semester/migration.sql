-- DropForeignKey
ALTER TABLE `enrollments` DROP FOREIGN KEY `semester_students_semester_id_fkey`;

-- DropForeignKey
ALTER TABLE `enrollments` DROP FOREIGN KEY `semester_students_student_id_fkey`;

-- CreateTable
CREATE TABLE `lecturer_semesters` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `lecturer_id` INTEGER NOT NULL,
    `semester_id` INTEGER NOT NULL,
    `max_students` INTEGER NOT NULL DEFAULT 5,

    UNIQUE INDEX `lecturer_semesters_lecturer_id_semester_id_key`(`lecturer_id`, `semester_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `lecturer_semesters` ADD CONSTRAINT `lecturer_semesters_lecturer_id_fkey` FOREIGN KEY (`lecturer_id`) REFERENCES `lecturers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lecturer_semesters` ADD CONSTRAINT `lecturer_semesters_semester_id_fkey` FOREIGN KEY (`semester_id`) REFERENCES `semesters`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `enrollments` ADD CONSTRAINT `enrollments_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `enrollments` ADD CONSTRAINT `enrollments_semester_id_fkey` FOREIGN KEY (`semester_id`) REFERENCES `semesters`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
