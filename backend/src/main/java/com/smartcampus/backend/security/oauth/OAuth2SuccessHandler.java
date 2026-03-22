package com.smartcampus.backend.security.oauth;

import com.smartcampus.backend.features.user.model.User;
import com.smartcampus.backend.features.user.repository.UserRepository;
import com.smartcampus.backend.security.jwt.JwtService;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class OAuth2SuccessHandler implements AuthenticationSuccessHandler {

    private final UserRepository userRepository;
    private final JwtService jwtService;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException, ServletException {
        OAuth2User principal = (OAuth2User) authentication.getPrincipal();
        String email = ((String) principal.getAttributes().getOrDefault("email", "")).toLowerCase().trim();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ServletException("OAuth2 user not found after login"));

        String accessToken = jwtService.generateAccessToken(user);
        response.setStatus(HttpServletResponse.SC_OK);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);

        String payload = "{\"accessToken\":\"" + escape(accessToken)
                + "\",\"tokenType\":\"Bearer\",\"user\":{"
                + "\"id\":" + user.getId() + ","
                + "\"fullName\":\"" + escape(user.getFullName()) + "\","
                + "\"email\":\"" + escape(user.getEmail()) + "\","
                + "\"role\":\"" + escape(user.getRole().name()) + "\","
                + "\"emailVerified\":" + user.isEmailVerified() + ","
                + "\"provider\":\"" + escape(user.getProvider().name()) + "\""
                + "}}";

        response.getWriter().write(payload);
        response.getWriter().flush();
    }

    private String escape(String input) {
        return input == null ? "" : input.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
