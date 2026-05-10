let unauthorizedHandler: (() => void) | null = null;
let lastUnauthorizedAt = 0;

export const setUnauthorizedHandler = (handler: (() => void) | null) => {
    unauthorizedHandler = handler;
};

export const emitUnauthorized = () => {
    const now = Date.now();
    if (now - lastUnauthorizedAt < 1000) return;
    lastUnauthorizedAt = now;
    unauthorizedHandler?.();
};
