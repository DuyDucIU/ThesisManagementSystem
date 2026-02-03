package iu.duyduc.thesis_management_system.controller;

import iu.duyduc.thesis_management_system.dto.response.StudentImportResponse;
import iu.duyduc.thesis_management_system.dto.response.StudentResponse;
import iu.duyduc.thesis_management_system.service.StudentService;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@AllArgsConstructor
@RestController
@RequestMapping("/api/admin/students")
public class AdminController {

    private final StudentService studentService;

//    @PreAuthorize("hasRole('ADMIN')")
//    @PostMapping(value = "/preview", consumes = "multipart/form-data")
//    public ResponseEntity<StudentPreviewResponse> uploadStudent(@RequestParam MultipartFile file) throws IOException {
//        List<StudentFileResponse> fileResponses = studentService.parseStudentFromFile(file.getInputStream());
//        StudentPreviewResponse previewResponse = studentService.validateStudentList(fileResponses);
//        return new ResponseEntity<>(previewResponse, HttpStatus.OK);
//    }

//    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/import")
    public ResponseEntity<StudentImportResponse> importStudents(@RequestParam MultipartFile file) throws IOException {
        StudentImportResponse response = studentService.importStudentFromFile(file.getInputStream());
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

//    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping
    public ResponseEntity<List<StudentResponse>> getAllStudents() {
        List<StudentResponse> studentResponseList = studentService.getAllStudents();
        return ResponseEntity.ok(studentResponseList);
    }
}
