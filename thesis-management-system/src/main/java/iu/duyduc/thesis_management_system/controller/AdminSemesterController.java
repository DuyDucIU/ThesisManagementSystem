package iu.duyduc.thesis_management_system.controller;

import iu.duyduc.thesis_management_system.dto.request.SemesterRequest;
import iu.duyduc.thesis_management_system.dto.response.SemesterResponse;
import iu.duyduc.thesis_management_system.entity.SemesterStatus;
import iu.duyduc.thesis_management_system.service.SemesterService;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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

    @GetMapping
    public ResponseEntity<List<SemesterResponse>> getAllSemester() {
        List<SemesterResponse> responses = semesterService.getAllSemester();
        return ResponseEntity.ok(responses);
    }

    @PatchMapping("/{semesterId}")
    public ResponseEntity<SemesterResponse> updateSemester(@PathVariable Long semesterId,
                                                           @RequestBody SemesterRequest semesterRequest) {
        SemesterResponse response = semesterService.updateSemester(semesterId, semesterRequest);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{semesterId}")
    public ResponseEntity<String> deleteSemester(@PathVariable Long semesterId) {
        semesterService.deleteSemester(semesterId);
        return ResponseEntity.ok("Semester deleted successfully!");
    }

    @PatchMapping("/{semesterId}/status")
    public ResponseEntity<SemesterResponse> updateSemesterStatus(@PathVariable Long semesterId,
                                                           @RequestParam("status") SemesterStatus status) {
        SemesterResponse response = semesterService.updateStatus(semesterId, status);
        return ResponseEntity.ok(response);
    }
}
