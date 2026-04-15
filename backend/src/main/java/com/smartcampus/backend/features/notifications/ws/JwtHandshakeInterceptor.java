package com.smartcampus.backend.features.notifications.ws;

import com.smartcampus.backend.features.auth.repository.RevokedTokenRepository;
import com.smartcampus.backend.features.auth.service.CustomUserDetailsService;
import com.smartcampus.backend.security.jwt.JwtService;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.http.HttpServletRequest;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

@Component
@RequiredArgsConstructor
public class JwtHandshakeInterceptor implements HandshakeInterceptor {

    public static final String WS_AUTH_USERNAME_ATTRIBUTE = "ws_auth_username";

    private final JwtService jwtService;
    private final CustomUserDetailsService userDetailsService;
    private final RevokedTokenRepository revokedTokenRepository;

    @Override
    public boolean beforeHandshake(ServerHttpRequest request,
                                   ServerHttpResponse response,
                                   WebSocketHandler wsHandler,
                                   Map<String, Object> attributes) {
        String token = extractToken(request);
        if (!StringUtils.hasText(token)) {
            return false;
        }

        try {
            String tokenType = jwtService.extractTokenType(token);
            String jti = jwtService.extractJti(token);
            String username = jwtService.extractUsername(token);

            if (!JwtService.TOKEN_TYPE_ACCESS.equals(tokenType)) {
                return false;
            }

            if (StringUtils.hasText(jti) && revokedTokenRepository.existsByJti(jti)) {
                return false;
            }

            UserDetails userDetails = userDetailsService.loadUserByUsername(username);
            if (!jwtService.isTokenValid(token, userDetails, JwtService.TOKEN_TYPE_ACCESS) || !userDetails.isEnabled()) {
                return false;
            }

            attributes.put(WS_AUTH_USERNAME_ATTRIBUTE, username);
            return true;
        } catch (JwtException | IllegalArgumentException ex) {
            return false;
        }
    }

    @Override
    public void afterHandshake(ServerHttpRequest request,
                               ServerHttpResponse response,
                               WebSocketHandler wsHandler,
                               Exception exception) {
        // No-op.
    }

    private String extractToken(ServerHttpRequest request) {
        if (request instanceof ServletServerHttpRequest servletRequest) {
            HttpServletRequest httpRequest = servletRequest.getServletRequest();
            String queryToken = httpRequest.getParameter("token");
            if (StringUtils.hasText(queryToken)) {
                return URLDecoder.decode(queryToken, StandardCharsets.UTF_8);
            }

            String authHeader = httpRequest.getHeader("Authorization");
            if (StringUtils.hasText(authHeader) && authHeader.startsWith("Bearer ")) {
                return authHeader.substring(7);
            }
        }

        return null;
    }
}

