// ─── Light theme ────────────────────────────────────────────────────────────
export const LIGHT_COLORS = {
    primary: '#16A34A',
    primaryDark: '#15803D',
    primaryLight: '#DCFCE7',
    secondary: '#0EA5E9',
    accent: '#F59E0B',
    danger: '#EF4444',
    warning: '#F97316',
    info: '#3B82F6',
    success: '#22C55E',

    background: '#F6F8F5',
    surface: '#FFFFFF',
    surfaceVariant: '#F0F7F2',
    border: '#E2E8E0',
    divider: '#EDF2EB',

    textPrimary: '#111827',
    textSecondary: '#4B5563',
    textHint: '#9CA3AF',
    textDisabled: '#D1D5DB',
    textInverse: '#FFFFFF',

    // Status
    statusActive: '#16A34A',
    statusPending: '#F59E0B',
    statusCancelled: '#EF4444',
    statusCompleted: '#3B82F6',

    // Booking status
    bookingPending: '#F97316',
    bookingConfirmed: '#16A34A',
    bookingCancelled: '#EF4444',
    bookingCompleted: '#3B82F6',
} as const;

// ─── Dark theme ──────────────────────────────────────────────────────────────
export const DARK_COLORS = {
    primary: '#22C55E',
    primaryDark: '#16A34A',
    primaryLight: '#14532D',
    secondary: '#38BDF8',
    accent: '#FCD34D',
    danger: '#F87171',
    warning: '#FB923C',
    info: '#60A5FA',
    success: '#4ADE80',

    background: '#0F172A',
    surface: '#1E293B',
    surfaceVariant: '#1A2535',
    border: '#334155',
    divider: '#1E293B',

    textPrimary: '#F1F5F9',
    textSecondary: '#94A3B8',
    textHint: '#64748B',
    textDisabled: '#475569',
    textInverse: '#0F172A',

    // Status
    statusActive: '#22C55E',
    statusPending: '#FCD34D',
    statusCancelled: '#F87171',
    statusCompleted: '#60A5FA',

    // Booking status
    bookingPending: '#FB923C',
    bookingConfirmed: '#22C55E',
    bookingCancelled: '#F87171',
    bookingCompleted: '#60A5FA',
} as const;

// Default export (light — kept for backward compatibility in plain StyleSheet contexts)
export const COLORS = LIGHT_COLORS;

export const SPACING = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    section: 40,
} as const;

export const FONT_SIZE = {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 20,
    xxxl: 24,
    display: 28,
    hero: 32,
} as const;

export const FONT_WEIGHT = {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
};

export const BORDER_RADIUS = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
} as const;

export const SHADOW = {
    sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 3,
    },
    lg: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 6,
    },
} as const;

export const ICON_SIZE = {
    xs: 14,
    sm: 16,
    md: 20,
    lg: 24,
    xl: 28,
    xxl: 32,
} as const;
