package iu.duyduc.thesis_management_system.controller;

import iu.duyduc.thesis_management_system.dto.request.LoginRequest;
import iu.duyduc.thesis_management_system.service.AuthService;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@AllArgsConstructor
@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<String> login(@RequestBody LoginRequest loginRequest) {
        String response = authService.login(loginRequest);
        return ResponseEntity.ok().body(response);
    }
}
