package iu.duyduc.thesis_management_system.repository;

import iu.duyduc.thesis_management_system.entity.Semester;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SemesterRepo extends JpaRepository<Semester, Long> {
}
