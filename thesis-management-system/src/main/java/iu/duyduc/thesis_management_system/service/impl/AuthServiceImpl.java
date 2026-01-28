package iu.duyduc.thesis_management_system.service.impl;

import iu.duyduc.thesis_management_system.dto.request.LoginRequest;
import iu.duyduc.thesis_management_system.service.AuthService;
import lombok.AllArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@AllArgsConstructor
@Service
public class AuthServiceImpl implements AuthService {
    private final AuthenticationManager authenticationManager;

    @Override
    public String login(LoginRequest loginRequest) {
        Authentication authenticatedUser = authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(
                loginRequest.getUsername(),
                loginRequest.getPassword()
        ));

        SecurityContextHolder.getContext().setAuthentication(authenticatedUser);

        return "Login successfully!!";
    }
}
