package iu.duyduc.thesis_management_system.controller;

import iu.duyduc.thesis_management_system.dto.request.SemesterRequest;
import iu.duyduc.thesis_management_system.dto.response.SemesterResponse;
import iu.duyduc.thesis_management_system.service.SemesterService;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@AllArgsConstructor
@RestController
@RequestMapping("/api/admin/semesters")
public class AdminSemesterController {
    private final SemesterService semesterService;

    @PostMapping
    public ResponseEntity<SemesterResponse> createSemester(@RequestBody SemesterRequest semesterRequest) {
        SemesterResponse response = semesterService.createSemester(semesterRequest);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }
}
