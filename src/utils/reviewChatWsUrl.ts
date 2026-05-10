import { API_BASE_URL } from '@config/api.config';

/**
 * Build WebSocket URL for review chat.
 * 
 * ⚠️ SECURITY NOTE: Token is passed as query parameter because WebSocket API
 * doesn't support custom headers in the browser. This is a known limitation.
 * Mitigation:
 * - Always use WSS (secure WebSocket) in production
 * - Backend should validate token signature, not just presence
 * - Token should have short expiration for WebSocket connections
 * - Ensure server logs don't expose query parameters
 * 
 * Format: /ws/reviews/{reviewId}?token=...
 */
export function buildReviewChatWebSocketUrl(reviewId: number, token: string): string {
    const httpUrl = new URL(API_BASE_URL);
    const protocol = httpUrl.protocol === 'https:' ? 'wss:' : 'ws:';
    const basePath = httpUrl.pathname.replace(/\/api\/v1\/?$/, '');
    const path = `${basePath || ''}/ws/reviews/${reviewId}`.replace(/\/{2,}/g, '/');
    return `${protocol}//${httpUrl.host}${path}?token=${encodeURIComponent(token)}`;
}
