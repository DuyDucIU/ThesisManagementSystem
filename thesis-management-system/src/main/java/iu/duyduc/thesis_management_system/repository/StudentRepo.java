package iu.duyduc.thesis_management_system.repository;

import iu.duyduc.thesis_management_system.entity.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface StudentRepo extends JpaRepository<Student, Long> {
    @Query("SELECT s.studentId FROM Student s")
    Set<String> findAllStudentIds();

    Optional<Student> findByStudentId(String studentId);

    boolean existsByStudentId(String studentId);

    List<Student> findByManagedByIsNull();

    boolean existsByStudentIdAndIdNot(String studentId, Long id);
}
