package iu.duyduc.thesis_management_system.service;

import iu.duyduc.thesis_management_system.dto.response.LecturerResponse;

import java.util.List;

public interface LecturerService {
    List<LecturerResponse> getAllLecturers();
}
