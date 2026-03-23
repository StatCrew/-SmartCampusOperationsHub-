package com.smartcampus.backend.features.auth.service;

import com.smartcampus.backend.features.auth.dto.AuthResponse;
import com.smartcampus.backend.features.auth.dto.LoginRequest;
import com.smartcampus.backend.features.auth.dto.LogoutRequest;
import com.smartcampus.backend.features.auth.dto.MeResponse;
import com.smartcampus.backend.features.auth.dto.RefreshTokenRequest;
import com.smartcampus.backend.features.auth.dto.RegisterRequest;
import com.smartcampus.backend.features.auth.model.RefreshToken;
import com.smartcampus.backend.features.auth.model.RevokedToken;
import com.smartcampus.backend.features.auth.repository.RefreshTokenRepository;
import com.smartcampus.backend.features.auth.repository.RevokedTokenRepository;
import com.smartcampus.backend.features.user.model.AuthProvider;
import com.smartcampus.backend.features.user.model.Role;
import com.smartcampus.backend.features.user.model.User;
import com.smartcampus.backend.features.user.repository.UserRepository;
import com.smartcampus.backend.security.jwt.JwtService;
import io.jsonwebtoken.JwtException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.UNAUTHORIZED;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final RefreshTokenRepository refreshTokenRepository;
    private final RevokedTokenRepository revokedTokenRepository;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String normalizedEmail = request.email().toLowerCase().trim();
        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new ResponseStatusException(BAD_REQUEST, "Email is already registered");
        }

        User user = User.builder()
                .fullName(request.fullName().trim())
                .email(normalizedEmail)
                .password(passwordEncoder.encode(request.password()))
                .role(Role.USER)
                .provider(AuthProvider.LOCAL)
                .emailVerified(false)
                .createdAt(Instant.now())
                .build();

        User savedUser = userRepository.save(user);
        return issueTokenPair(savedUser);
    }

    public AuthResponse login(LoginRequest request) {
        String normalizedEmail = request.email().toLowerCase().trim();
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(normalizedEmail, request.password()));
            User user = (User) authentication.getPrincipal();
            return issueTokenPair(user);
        } catch (BadCredentialsException ex) {
            throw new ResponseStatusException(UNAUTHORIZED, "Invalid email or password");
        }
    }

    @Transactional
    public AuthResponse refresh(RefreshTokenRequest request) {
        String refreshToken = request.refreshToken().trim();
        String tokenHash = hashToken(refreshToken);

        RefreshToken storedToken = refreshTokenRepository.findByTokenHashAndRevokedFalse(tokenHash)
                .orElseThrow(() -> new ResponseStatusException(UNAUTHORIZED, "Invalid refresh token"));

        if (storedToken.getExpiresAt().isBefore(Instant.now())) {
            storedToken.setRevoked(true);
            storedToken.setRevokedAt(Instant.now());
            refreshTokenRepository.save(storedToken);
            throw new ResponseStatusException(UNAUTHORIZED, "Refresh token expired");
        }

        User user = storedToken.getUser();

        try {
            if (!jwtService.isTokenValid(refreshToken, user, JwtService.TOKEN_TYPE_REFRESH)) {
                throw new ResponseStatusException(UNAUTHORIZED, "Invalid refresh token");
            }
        } catch (JwtException | IllegalArgumentException ex) {
            throw new ResponseStatusException(UNAUTHORIZED, "Invalid refresh token");
        }

        storedToken.setRevoked(true);
        storedToken.setRevokedAt(Instant.now());
        refreshTokenRepository.save(storedToken);

        return issueTokenPair(user);
    }

    @Transactional
    public void logout(Authentication authentication, String authorizationHeader, LogoutRequest request) {
        String refreshToken = request == null ? null : request.refreshToken();
        if (refreshToken != null && !refreshToken.isBlank()) {
            revokeRefreshToken(refreshToken.trim(), authentication);
        }

        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            return;
        }

        String accessToken = authorizationHeader.substring(7);
        try {
            if (!JwtService.TOKEN_TYPE_ACCESS.equals(jwtService.extractTokenType(accessToken))) {
                return;
            }

            String jti = jwtService.extractJti(accessToken);
            Instant expiresAt = jwtService.extractExpiration(accessToken);

            if (jti != null && !jti.isBlank() && !expiresAt.isBefore(Instant.now()) && !revokedTokenRepository.existsByJti(jti)) {
                revokedTokenRepository.save(RevokedToken.builder()
                        .jti(jti)
                        .expiresAt(expiresAt)
                        .revokedAt(Instant.now())
                        .build());
            }
        } catch (JwtException | IllegalArgumentException ignored) {
            // Ignore malformed/expired access token during logout.
        }
    }

    public MeResponse me(User authenticatedUser) {
        return new MeResponse(
                authenticatedUser.getId(),
                authenticatedUser.getFullName(),
                authenticatedUser.getEmail(),
                authenticatedUser.getRole().name(),
                authenticatedUser.isEmailVerified(),
                authenticatedUser.getProvider().name());
    }

    public AuthResponse issueOAuthToken(User user) {
        return issueTokenPair(user);
    }

    private AuthResponse issueTokenPair(User user) {
        refreshTokenRepository.deleteByExpiresAtBefore(Instant.now());
        revokedTokenRepository.deleteByExpiresAtBefore(Instant.now());

        String accessToken = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken(user);

        refreshTokenRepository.save(RefreshToken.builder()
                .user(user)
                .tokenHash(hashToken(refreshToken))
                .expiresAt(jwtService.extractExpiration(refreshToken))
                .revoked(false)
                .createdAt(Instant.now())
                .build());

        return mapAuthResponse(user, accessToken, refreshToken);
    }

    private AuthResponse mapAuthResponse(User user, String accessToken, String refreshToken) {
        AuthResponse.UserSummary summary = new AuthResponse.UserSummary(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getRole().name(),
                user.isEmailVerified(),
                user.getProvider().name());

        return new AuthResponse(accessToken, refreshToken, "Bearer", summary);
    }

    private void revokeRefreshToken(String refreshToken, Authentication authentication) {
        String tokenHash = hashToken(refreshToken);
        RefreshToken storedToken = refreshTokenRepository.findByTokenHashAndRevokedFalse(tokenHash)
                .orElse(null);

        if (storedToken == null) {
            return;
        }

        if (authentication != null
                && !(authentication instanceof AnonymousAuthenticationToken)
                && authentication.getPrincipal() instanceof User authenticatedUser
                && !storedToken.getUser().getId().equals(authenticatedUser.getId())) {
            throw new ResponseStatusException(UNAUTHORIZED, "Refresh token does not belong to authenticated user");
        }

        storedToken.setRevoked(true);
        storedToken.setRevokedAt(Instant.now());
        refreshTokenRepository.save(storedToken);
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 algorithm is not available", ex);
        }
    }
}

