package iu.duyduc.thesis_management_system.repository;

import iu.duyduc.thesis_management_system.entity.Student;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StudentRepo extends JpaRepository<Student, Long> {
}
