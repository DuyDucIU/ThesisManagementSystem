package iu.duyduc.thesis_management_system.repository;

import iu.duyduc.thesis_management_system.entity.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Set;

public interface StudentRepo extends JpaRepository<Student, Long> {
    @Query("SELECT s.studentId FROM Student s")
    Set<String> findAllStudentIds();

    boolean existsByStudentId(String studentId);
}
