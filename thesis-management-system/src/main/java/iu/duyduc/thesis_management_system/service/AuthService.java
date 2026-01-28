package iu.duyduc.thesis_management_system.service;

import iu.duyduc.thesis_management_system.dto.request.LoginRequest;
import iu.duyduc.thesis_management_system.dto.response.AuthResponse;

public interface AuthService {
    AuthResponse login(LoginRequest loginRequest);
}
