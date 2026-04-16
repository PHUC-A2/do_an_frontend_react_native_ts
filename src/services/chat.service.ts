import api from './api';
import { ENDPOINTS } from '@config/api.config';
import { RestResponse } from '@/types/common.types';

interface PublicMessengerConfigDTO {
    pageId: string;
}

interface AiChatReqDTO {
    message: string;
    history?: { role: string; content: string }[];
}

interface AiChatResDTO {
    reply: string;
    provider: string;
    offTopic: boolean;
    remainingMessages: number;
}

export const chatService = {
    getPublicMessengerConfig: () =>
        api.get<RestResponse<PublicMessengerConfigDTO>>(ENDPOINTS.SYSTEM_CONFIG.PUBLIC_MESSENGER),

    clientAiChat: (data: AiChatReqDTO) =>
        api.post<RestResponse<AiChatResDTO>>(ENDPOINTS.AI.CLIENT_CHAT, data),
};
