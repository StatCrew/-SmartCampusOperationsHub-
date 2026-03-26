package com.smartcampus.backend.security.oauth;

import com.smartcampus.backend.features.auth.dto.AuthResponse;
import com.smartcampus.backend.features.auth.service.AuthService;
import com.smartcampus.backend.features.user.model.User;
import com.smartcampus.backend.features.user.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class OAuth2SuccessHandler implements AuthenticationSuccessHandler {

    private final UserRepository userRepository;
    private final ObjectProvider<AuthService> authServiceProvider;

    @Value("${app.oauth2.success-redirect-uri:http://localhost:5173/oauth/callback}")
    private String successRedirectUri;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException {
        OAuth2User principal = (OAuth2User) authentication.getPrincipal();
        String email = ((String) principal.getAttributes().getOrDefault("email", "")).toLowerCase().trim();
        String name = (String) principal.getAttributes().getOrDefault("name", "Campus User");

        User user = userRepository.findByEmail(email).orElseGet(() -> {
            log.warn("OAuth success user not found in DB for email {}. Creating fallback user record.", email);
            User fallback = User.builder()
                    .fullName(name)
                    .email(email)
                    .password("OAUTH2_USER")
                    .role(com.smartcampus.backend.features.user.model.Role.USER)
                    .provider(com.smartcampus.backend.features.user.model.AuthProvider.GOOGLE)
                    .emailVerified(true)
                    .createdAt(java.time.Instant.now())
                    .build();
            return userRepository.save(fallback);
        });

        AuthResponse authResponse = authServiceProvider.getObject().issueOAuthToken(user);

        AuthResponse.UserSummary summary = authResponse.user();
        String redirectUrl = successRedirectUri
                + "?accessToken=" + encode(authResponse.accessToken())
                + "&refreshToken=" + encode(authResponse.refreshToken())
                + "&tokenType=" + encode(authResponse.tokenType())
                + "&id=" + summary.id()
                + "&fullName=" + encode(summary.fullName())
                + "&email=" + encode(summary.email())
                + "&role=" + encode(summary.role())
                + "&emailVerified=" + summary.emailVerified()
                + "&provider=" + encode(summary.provider());

        response.sendRedirect(redirectUrl);
    }

    private String encode(String value) {
        return URLEncoder.encode(value == null ? "" : value, StandardCharsets.UTF_8);
    }
}
