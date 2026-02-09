package iu.duyduc.thesis_management_system.controller.admin;

import iu.duyduc.thesis_management_system.dto.response.LecturerResponse;
import iu.duyduc.thesis_management_system.service.LecturerService;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@AllArgsConstructor
@RestController
@RequestMapping("/api/admin/lecturers")
public class AdminLecturerController {
    private final LecturerService lecturerService;

    @GetMapping
    public ResponseEntity<List<LecturerResponse>> getAllLecturers() {
        List<LecturerResponse> responses = lecturerService.getAllLecturers();
        return ResponseEntity.ok(responses);
    }
}
