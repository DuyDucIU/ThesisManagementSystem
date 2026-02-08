package iu.duyduc.thesis_management_system.mapper;

import iu.duyduc.thesis_management_system.dto.response.SemesterResponse;
import iu.duyduc.thesis_management_system.entity.Semester;
import org.mapstruct.Mapper;

import java.util.List;

@Mapper(componentModel = "spring")
public interface SemesterMapper {
    SemesterResponse toSemesterResponse(Semester semester);
    List<SemesterResponse> toResponseList(List<Semester> semesterList);
}
