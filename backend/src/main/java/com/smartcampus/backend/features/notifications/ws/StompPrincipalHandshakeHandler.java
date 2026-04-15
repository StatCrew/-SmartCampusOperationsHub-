package com.smartcampus.backend.features.notifications.ws;

import java.security.Principal;
import java.util.Map;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.support.DefaultHandshakeHandler;

@Component
public class StompPrincipalHandshakeHandler extends DefaultHandshakeHandler {

    @Override
    protected Principal determineUser(ServerHttpRequest request,
                                      WebSocketHandler wsHandler,
                                      Map<String, Object> attributes) {
        Object usernameAttribute = attributes.get(JwtHandshakeInterceptor.WS_AUTH_USERNAME_ATTRIBUTE);
        String username = usernameAttribute == null ? null : String.valueOf(usernameAttribute);

        if (!StringUtils.hasText(username)) {
            return super.determineUser(request, wsHandler, attributes);
        }

        return new StompPrincipal(username);
    }

    private record StompPrincipal(String name) implements Principal {
        @Override
        @Nullable
        public String getName() {
            return name;
        }
    }
}

