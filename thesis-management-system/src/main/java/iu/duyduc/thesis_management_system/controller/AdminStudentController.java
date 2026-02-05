package iu.duyduc.thesis_management_system.controller;

import iu.duyduc.thesis_management_system.dto.request.StudentRequest;
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
public class AdminStudentController {

    private final StudentService studentService;

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

    @PostMapping
    public ResponseEntity<StudentResponse> createStudent(@RequestBody StudentRequest request) {
        StudentResponse response = studentService.createStudent(request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @PatchMapping("/{id}")
    public ResponseEntity<StudentResponse> updateStudent(@PathVariable Long id , @RequestBody StudentRequest request) {
        StudentResponse response = studentService.updateStudent(id, request);
        return new ResponseEntity<>(response, HttpStatus.OK);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteStudent(@PathVariable Long id) {
        studentService.deleteStudent(id);
        return new ResponseEntity<>("Student deleted successfully !" , HttpStatus.OK);
    }
}
