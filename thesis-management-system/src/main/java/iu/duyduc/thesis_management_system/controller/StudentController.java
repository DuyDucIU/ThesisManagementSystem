package iu.duyduc.thesis_management_system.controller;

import iu.duyduc.thesis_management_system.service.StudentService;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@AllArgsConstructor
@RestController
@RequestMapping("/api/admin")
public class StudentController {

    private final StudentService studentService;

    @PostMapping(value = "/upload", consumes = "multipart/form-data")
    public ResponseEntity<String> uploadStudent(@RequestParam MultipartFile file) throws IOException {
        studentService.saveStudentsFromFile(file.getInputStream());
        return new ResponseEntity<>("Student uploaded successfully", HttpStatus.CREATED);
    }
}
