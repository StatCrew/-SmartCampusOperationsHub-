package com.smartcampus.backend.security.oauth;

import com.smartcampus.backend.features.auth.dto.AuthResponse;
import com.smartcampus.backend.features.auth.service.AuthService;
import com.smartcampus.backend.features.user.model.User;
import com.smartcampus.backend.features.user.repository.UserRepository;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class OAuth2SuccessHandler implements AuthenticationSuccessHandler {

    private final UserRepository userRepository;
    private final ObjectProvider<AuthService> authServiceProvider;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException, ServletException {
        OAuth2User principal = (OAuth2User) authentication.getPrincipal();
        String email = ((String) principal.getAttributes().getOrDefault("email", "")).toLowerCase().trim();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ServletException("OAuth2 user not found after login"));

        AuthResponse authResponse = authServiceProvider.getObject().issueOAuthToken(user);
        response.setStatus(HttpServletResponse.SC_OK);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);

        AuthResponse.UserSummary summary = authResponse.user();
        String payload = "{\"accessToken\":\"" + escape(authResponse.accessToken())
                + "\",\"refreshToken\":\"" + escape(authResponse.refreshToken())
                + "\",\"tokenType\":\"" + escape(authResponse.tokenType())
                + "\",\"user\":{"
                + "\"id\":" + summary.id() + ","
                + "\"fullName\":\"" + escape(summary.fullName()) + "\","
                + "\"email\":\"" + escape(summary.email()) + "\","
                + "\"role\":\"" + escape(summary.role()) + "\","
                + "\"emailVerified\":" + summary.emailVerified() + ","
                + "\"provider\":\"" + escape(summary.provider()) + "\""
                + "}}";

        response.getWriter().write(payload);
        response.getWriter().flush();
    }

    private String escape(String input) {
        return input == null ? "" : input.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
