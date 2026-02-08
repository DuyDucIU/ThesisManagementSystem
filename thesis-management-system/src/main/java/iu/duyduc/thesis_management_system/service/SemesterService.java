package iu.duyduc.thesis_management_system.service;

import iu.duyduc.thesis_management_system.dto.request.SemesterRequest;
import iu.duyduc.thesis_management_system.dto.response.SemesterResponse;
import iu.duyduc.thesis_management_system.entity.SemesterStatus;

import java.util.List;

public interface SemesterService {
    SemesterResponse createSemester(SemesterRequest semesterRequest);
    List<SemesterResponse> getAllSemester();
    SemesterResponse updateSemester(Long semesterId, SemesterRequest semesterRequest);
    void deleteSemester(Long semesterId);
    SemesterResponse updateStatus(Long semesterId, SemesterStatus status);
}
