package iu.duyduc.thesis_management_system.service;

import iu.duyduc.thesis_management_system.dto.request.LoginRequest;

public interface AuthService {
    String login(LoginRequest loginRequest);
}
