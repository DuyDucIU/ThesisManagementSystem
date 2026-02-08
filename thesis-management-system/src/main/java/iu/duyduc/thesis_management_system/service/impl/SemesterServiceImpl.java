package iu.duyduc.thesis_management_system.service.impl;

import iu.duyduc.thesis_management_system.dto.request.SemesterRequest;
import iu.duyduc.thesis_management_system.dto.response.SemesterResponse;
import iu.duyduc.thesis_management_system.entity.Semester;
import iu.duyduc.thesis_management_system.entity.SemesterStatus;
import iu.duyduc.thesis_management_system.exception.ApiException;
import iu.duyduc.thesis_management_system.exception.ResourceNotFoundException;
import iu.duyduc.thesis_management_system.mapper.SemesterMapper;
import iu.duyduc.thesis_management_system.repository.SemesterRepo;
import iu.duyduc.thesis_management_system.service.SemesterService;
import jakarta.transaction.Transactional;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Objects;

@AllArgsConstructor
@Service
public class SemesterServiceImpl implements SemesterService {
    private final SemesterRepo semesterRepo;
    private final SemesterMapper semesterMapper;

    @Transactional
    @Override
    public SemesterResponse createSemester(SemesterRequest semesterRequest) {
        validateDateRequest(semesterRequest);

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

    @Override
    public List<SemesterResponse> getAllSemester() {
        List<Semester> semesters = semesterRepo.findAll();

        return semesterMapper.toResponseList(semesters);
    }

    @Transactional
    @Override
    public SemesterResponse updateSemester(Long semesterId, SemesterRequest semesterRequest) {
        Semester semester = semesterRepo.findById(semesterId)
                .orElseThrow(() -> new ResourceNotFoundException("Semester not found: " + semesterId));

        if (semesterRequest.getCode() != null && !semesterRequest.getCode().isBlank()) {
            if (!semesterRequest.getCode().equals(semester.getCode())
                    && semesterRepo.existsByCodeAndIdNot(semesterRequest.getCode(), semesterId)) {
                throw new ApiException("Semester code already existed: " + semesterRequest.getCode());
            }
        }

        if (semesterRequest.getName() != null
                && !semesterRequest.getName().isBlank()
                && !semesterRequest.getName().equals(semester.getName()))
            semester.setName(semesterRequest.getName());

        validateDateRequest(semesterRequest, semester);

        if (semesterRequest.getStartDate() != null
                && !Objects.equals(semesterRequest.getStartDate(), semester.getStartDate())) {

            semester.setStartDate(semesterRequest.getStartDate());
        }

        if (semesterRequest.getEndDate() != null
                && !Objects.equals(semesterRequest.getEndDate(), semester.getEndDate())) {

            semester.setEndDate(semesterRequest.getEndDate());
        }

        Semester updatedSemester = semesterRepo.save(semester);

        return semesterMapper.toSemesterResponse(updatedSemester);
    }

    @Transactional
    @Override
    public void deleteSemester(Long semesterId) {
        Semester semester = semesterRepo.findById(semesterId)
                .orElseThrow(() -> new ResourceNotFoundException("Semester not found: " + semesterId));
        semesterRepo.delete(semester);
    }

    @Override
    public SemesterResponse updateStatus(Long semesterId, SemesterStatus status) {
        Semester semester = semesterRepo.findById(semesterId)
                .orElseThrow(() -> new ResourceNotFoundException("Semester not found: " + semesterId));
        if (semesterRepo.existsByStatus(SemesterStatus.ACTIVE) && status.equals(SemesterStatus.ACTIVE))
            throw new ApiException("Another semester is activing at the moment");

        semester.setStatus(status);

        Semester updatedSemester =  semesterRepo.save(semester);

        return semesterMapper.toSemesterResponse(updatedSemester);
    }

    //    Validate start date and end date for CREATE
    private void validateDateRequest(SemesterRequest request) {
        if (request.getStartDate() == null || request.getEndDate() == null) {
            throw new ApiException("Start date and end date must not be null");
        }

        if (request.getStartDate().isAfter(request.getEndDate())) {
            throw new ApiException("Start date must be before end date");
        }
    }
//    Validate start date and end date for UPDATE
    private void validateDateRequest(SemesterRequest request, Semester current) {

        LocalDate start = request.getStartDate() != null
                ? request.getStartDate()
                : current.getStartDate();

        LocalDate end = request.getEndDate() != null
                ? request.getEndDate()
                : current.getEndDate();

        if (start.isAfter(end)) {
            throw new ApiException("Start date must be before end date");
        }
    }
}
