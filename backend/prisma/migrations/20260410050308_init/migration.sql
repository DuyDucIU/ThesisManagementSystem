-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(191) NOT NULL,
    `role` ENUM('ADMIN', 'LECTURER', 'STUDENT') NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `semesters` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `status` ENUM('INACTIVE', 'ACTIVE', 'CLOSED') NOT NULL DEFAULT 'INACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `semesters_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lecturers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `lecturer_id` VARCHAR(191) NOT NULL,
    `full_name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NULL,
    `max_students` INTEGER NOT NULL DEFAULT 5,

    UNIQUE INDEX `lecturers_user_id_key`(`user_id`),
    UNIQUE INDEX `lecturers_lecturer_id_key`(`lecturer_id`),
    UNIQUE INDEX `lecturers_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `students` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NULL,
    `student_id` VARCHAR(191) NOT NULL,
    `full_name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `students_user_id_key`(`user_id`),
    UNIQUE INDEX `students_student_id_key`(`student_id`),
    UNIQUE INDEX `students_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `semester_students` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `student_id` INTEGER NOT NULL,
    `semester_id` INTEGER NOT NULL,
    `status` ENUM('AVAILABLE', 'ASSIGNED', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'AVAILABLE',

    UNIQUE INDEX `semester_students_student_id_semester_id_key`(`student_id`, `semester_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `topics` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `semester_id` INTEGER NOT NULL,
    `lecturer_id` INTEGER NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `requirements` TEXT NULL,
    `note` TEXT NULL,
    `status` ENUM('OPEN', 'CLOSED', 'FULL') NOT NULL DEFAULT 'OPEN',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `theses` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `semester_student_id` INTEGER NOT NULL,
    `topic_id` INTEGER NOT NULL,
    `reviewer_id` INTEGER NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `status` ENUM('IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'UNDER_REVIEW', 'REVIEWED') NOT NULL DEFAULT 'IN_PROGRESS',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `theses_semester_student_id_key`(`semester_student_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `documents` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `thesis_id` INTEGER NOT NULL,
    `doc_type` ENUM('REGISTRATION', 'CONFIRMATION', 'THESIS_REPORT') NOT NULL,
    `original_name` VARCHAR(191) NOT NULL,
    `s3_key` VARCHAR(191) NOT NULL,
    `mime_type` VARCHAR(191) NOT NULL,
    `file_size` INTEGER NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `status` ENUM('PENDING', 'LECTURER_APPROVED', 'LECTURER_REJECTED', 'ADMIN_APPROVED', 'ADMIN_REJECTED') NOT NULL DEFAULT 'PENDING',
    `lecturer_feedback` TEXT NULL,
    `lecturer_reviewed_by` INTEGER NULL,
    `lecturer_reviewed_at` DATETIME(3) NULL,
    `admin_feedback` TEXT NULL,
    `admin_reviewed_by` INTEGER NULL,
    `admin_reviewed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `thesis_reviews` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `thesis_id` INTEGER NOT NULL,
    `reviewer_id` INTEGER NOT NULL,
    `score` DECIMAL(4, 2) NOT NULL,
    `comment` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `thesis_reviews_thesis_id_key`(`thesis_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `is_read` BOOLEAN NOT NULL DEFAULT false,
    `related_id` INTEGER NULL,
    `related_type` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `lecturers` ADD CONSTRAINT `lecturers_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `students` ADD CONSTRAINT `students_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `semester_students` ADD CONSTRAINT `semester_students_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `semester_students` ADD CONSTRAINT `semester_students_semester_id_fkey` FOREIGN KEY (`semester_id`) REFERENCES `semesters`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `topics` ADD CONSTRAINT `topics_semester_id_fkey` FOREIGN KEY (`semester_id`) REFERENCES `semesters`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `topics` ADD CONSTRAINT `topics_lecturer_id_fkey` FOREIGN KEY (`lecturer_id`) REFERENCES `lecturers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `theses` ADD CONSTRAINT `theses_semester_student_id_fkey` FOREIGN KEY (`semester_student_id`) REFERENCES `semester_students`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `theses` ADD CONSTRAINT `theses_topic_id_fkey` FOREIGN KEY (`topic_id`) REFERENCES `topics`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `theses` ADD CONSTRAINT `theses_reviewer_id_fkey` FOREIGN KEY (`reviewer_id`) REFERENCES `lecturers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documents` ADD CONSTRAINT `documents_thesis_id_fkey` FOREIGN KEY (`thesis_id`) REFERENCES `theses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documents` ADD CONSTRAINT `documents_lecturer_reviewed_by_fkey` FOREIGN KEY (`lecturer_reviewed_by`) REFERENCES `lecturers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documents` ADD CONSTRAINT `documents_admin_reviewed_by_fkey` FOREIGN KEY (`admin_reviewed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `thesis_reviews` ADD CONSTRAINT `thesis_reviews_thesis_id_fkey` FOREIGN KEY (`thesis_id`) REFERENCES `theses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `thesis_reviews` ADD CONSTRAINT `thesis_reviews_reviewer_id_fkey` FOREIGN KEY (`reviewer_id`) REFERENCES `lecturers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
