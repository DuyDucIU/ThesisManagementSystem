package iu.duyduc.thesis_management_system.mapper;

import iu.duyduc.thesis_management_system.dto.response.StudentResponse;
import iu.duyduc.thesis_management_system.entity.Student;
import org.mapstruct.Mapper;

import java.util.List;

@Mapper(componentModel = "spring")
public interface StudentMapper {
    StudentResponse toStudentResponse(Student student);
    List<StudentResponse> toResponseList(List<Student> students);
}
