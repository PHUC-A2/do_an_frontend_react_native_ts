import { API_BASE_URL } from '@config/api.config';

/** URL WebSocket chat đánh giá: `/ws/reviews/{reviewId}?token=...` (giống web). */
export function buildReviewChatWebSocketUrl(reviewId: number, token: string): string {
    const httpUrl = new URL(API_BASE_URL);
    const protocol = httpUrl.protocol === 'https:' ? 'wss:' : 'ws:';
    const basePath = httpUrl.pathname.replace(/\/api\/v1\/?$/, '');
    const path = `${basePath || ''}/ws/reviews/${reviewId}`.replace(/\/{2,}/g, '/');
    return `${protocol}//${httpUrl.host}${path}?token=${encodeURIComponent(token)}`;
}
