package com.smartcampus.backend.security.oauth;

import com.smartcampus.backend.features.user.model.AuthProvider;
import com.smartcampus.backend.features.user.model.Role;
import com.smartcampus.backend.features.user.model.User;
import com.smartcampus.backend.features.user.repository.UserRepository;
import java.time.Instant;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CustomOAuth2UserService implements OAuth2UserService<OAuth2UserRequest, OAuth2User> {

    private final UserRepository userRepository;

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2UserService<OAuth2UserRequest, OAuth2User> delegate = new DefaultOAuth2UserService();
        OAuth2User oauthUser = delegate.loadUser(userRequest);

        Map<String, Object> attributes = oauthUser.getAttributes();
        String email = ((String) attributes.getOrDefault("email", "")).toLowerCase().trim();
        String name = (String) attributes.getOrDefault("name", "Campus User");

        if (email.isBlank()) {
            throw new OAuth2AuthenticationException("Google account email is required");
        }

        User user = userRepository.findByEmail(email)
                .map(existing -> {
                    existing.setProvider(AuthProvider.GOOGLE);
                    existing.setEmailVerified(true);
                    return existing;
                })
                .orElseGet(() -> User.builder()
                        .fullName(name)
                        .email(email)
                        .password("OAUTH2_USER")
                        .role(Role.USER)
                        .provider(AuthProvider.GOOGLE)
                        .emailVerified(true)
                        .createdAt(Instant.now())
                        .build());

        User saved = userRepository.save(user);
        attributes.put("dbUserId", saved.getId());

        return new DefaultOAuth2User(oauthUser.getAuthorities(), attributes, "email");
    }
}

