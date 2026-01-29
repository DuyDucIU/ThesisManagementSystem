package iu.duyduc.thesis_management_system.exception;

import org.jspecify.annotations.Nullable;
import org.springframework.security.core.AuthenticationException;

public class JwtAuthenticationException extends AuthenticationException {
    public JwtAuthenticationException(String message) {
        super(message);
    }

  public JwtAuthenticationException(@Nullable String msg, Throwable cause) {
    super(msg, cause);
  }
}
