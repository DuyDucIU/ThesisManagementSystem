package iu.duyduc.thesis_management_system.controller;

import iu.duyduc.thesis_management_system.dto.request.AssignStudentRequest;
import iu.duyduc.thesis_management_system.dto.response.StudentResponse;
import iu.duyduc.thesis_management_system.service.StudentService;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@AllArgsConstructor
@RestController
@RequestMapping("/api/lecturer/students")
public class LecturerController {

    private final StudentService studentService;

    @GetMapping
    public ResponseEntity<List<StudentResponse>> getAllStudents() {
        List<StudentResponse> studentResponseList = studentService.getAllUnassignedStudents();
        return ResponseEntity.ok(studentResponseList);
    }

    @PostMapping
    public ResponseEntity<String> assignStudent(@RequestBody AssignStudentRequest assignStudentRequestList) {
        String response = studentService.assignStudent(assignStudentRequestList, 2L);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }
}
