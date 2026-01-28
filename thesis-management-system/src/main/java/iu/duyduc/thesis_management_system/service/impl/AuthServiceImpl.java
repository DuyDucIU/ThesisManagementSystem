package iu.duyduc.thesis_management_system.service.impl;

import iu.duyduc.thesis_management_system.dto.request.LoginRequest;
import iu.duyduc.thesis_management_system.dto.response.AuthResponse;
import iu.duyduc.thesis_management_system.dto.response.UserResponse;
import iu.duyduc.thesis_management_system.entity.Role;
import iu.duyduc.thesis_management_system.entity.User;
import iu.duyduc.thesis_management_system.exception.ResourceNotFoundException;
import iu.duyduc.thesis_management_system.repository.UserRepo;
import iu.duyduc.thesis_management_system.security.JwtUtils;
import iu.duyduc.thesis_management_system.service.AuthService;
import lombok.AllArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@AllArgsConstructor
@Service
public class AuthServiceImpl implements AuthService {
    private final AuthenticationManager authenticationManager;
    private final JwtUtils jwtUtils;
    private final UserRepo userRepo;

    @Override
    public AuthResponse login(LoginRequest loginRequest) {
        Authentication authenticatedUser = authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(
                loginRequest.getUsername(),
                loginRequest.getPassword()
        ));

        User user = userRepo.findByUsername(loginRequest.getUsername()).orElseThrow();

        List<String> userRoles = user.getRoles().stream()
                .map(Role::getName)
                .collect(Collectors.toList());

        String token = jwtUtils.generateToken(authenticatedUser);

        SecurityContextHolder.getContext().setAuthentication(authenticatedUser);

        UserResponse userResponse = UserResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .roles(userRoles)
                .build();

        return new AuthResponse(token, true, userResponse);
    }
}
