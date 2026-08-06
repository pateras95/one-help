package com.onehelp.backend.common.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Authenticates a request from its {@code Authorization: Bearer <token>} header
 * (ADR-1). Trusts the token's claims for the remainder of the request without a
 * database round-trip — the access token's short TTL (15 min) is the accepted
 * staleness ceiling (ADR-3); {@code GET /auth/me} re-reads the live user row
 * separately when a caller needs up-to-the-second state.
 *
 * <p>On a missing, malformed, or expired token, this filter simply leaves the request
 * unauthenticated and continues the chain — {@link SecurityConfig} then rejects it via
 * the normal {@code authenticated()} rule (translated to 401 by
 * {@link RestAuthenticationEntryPoint}) for any endpoint that requires it.
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);
    private static final String BEARER_PREFIX = "Bearer ";

    private final AccessTokenService accessTokenService;

    public JwtAuthenticationFilter(AccessTokenService accessTokenService) {
        this.accessTokenService = accessTokenService;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith(BEARER_PREFIX)) {
            String token = header.substring(BEARER_PREFIX.length());
            try {
                AccessTokenClaims claims = accessTokenService.parse(token);
                var authorities = List.of(new SimpleGrantedAuthority("ROLE_" + claims.role().name()));
                var authentication = new UsernamePasswordAuthenticationToken(
                        claims.userId().toString(), null, authorities);
                SecurityContextHolder.getContext().setAuthentication(authentication);
            } catch (TokenSigner.InvalidTokenException ex) {
                log.debug("Rejected invalid/expired access token: {}", ex.getMessage());
            }
        }
        filterChain.doFilter(request, response);
    }
}
