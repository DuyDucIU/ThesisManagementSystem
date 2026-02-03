package iu.duyduc.thesis_management_system.controller;

import iu.duyduc.thesis_management_system.dto.request.AssignStudentRequest;
import iu.duyduc.thesis_management_system.dto.response.StudentResponse;
import iu.duyduc.thesis_management_system.security.UserPrincipal;
import iu.duyduc.thesis_management_system.service.StudentService;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@AllArgsConstructor
@RestController
@RequestMapping("/api/lecturer/students")
public class LecturerController {

    private final StudentService studentService;

    @GetMapping("/unassigned")
    public ResponseEntity<List<StudentResponse>> getAllStudents() {
        List<StudentResponse> studentResponseList = studentService.getAllUnassignedStudents();
        return ResponseEntity.ok(studentResponseList);
    }

    @PreAuthorize("hasRole('LECTURER')")
    @PostMapping("/assign")
    public ResponseEntity<String> assignStudent(@RequestBody AssignStudentRequest assignStudentRequestList,
                                                @AuthenticationPrincipal UserPrincipal user) {
        String response = studentService.assignStudent(assignStudentRequestList, user.getUserId());
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }
}
