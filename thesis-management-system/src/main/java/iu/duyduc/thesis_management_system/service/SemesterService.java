package iu.duyduc.thesis_management_system.service;

import iu.duyduc.thesis_management_system.dto.request.SemesterRequest;
import iu.duyduc.thesis_management_system.dto.response.SemesterResponse;

public interface SemesterService {
    SemesterResponse createSemester(SemesterRequest semesterRequest);
}
