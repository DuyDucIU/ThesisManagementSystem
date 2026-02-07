package iu.duyduc.thesis_management_system.service.impl;

import iu.duyduc.thesis_management_system.dto.request.SemesterRequest;
import iu.duyduc.thesis_management_system.dto.response.SemesterResponse;
import iu.duyduc.thesis_management_system.entity.Semester;
import iu.duyduc.thesis_management_system.entity.SemesterStatus;
import iu.duyduc.thesis_management_system.mapper.SemesterMapper;
import iu.duyduc.thesis_management_system.repository.SemesterRepo;
import iu.duyduc.thesis_management_system.service.SemesterService;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

@AllArgsConstructor
@Service
public class SemesterServiceImpl implements SemesterService {
    private final SemesterRepo semesterRepo;
    private final SemesterMapper semesterMapper;

    @Override
    public SemesterResponse createSemester(SemesterRequest semesterRequest) {
        Semester semester = Semester.builder()
                .code(semesterRequest.getCode())
                .name(semesterRequest.getName())
                .startDate(semesterRequest.getStartDate())
                .endDate(semesterRequest.getEndDate())
                .status(SemesterStatus.UPCOMING)
                .build();
        Semester savedSemester = semesterRepo.save(semester);

        return semesterMapper.toSemesterResponse(savedSemester);
    }
}
