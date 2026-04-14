import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { vi } from 'date-fns/locale';

export const formatDate = (iso: string, pattern = 'dd/MM/yyyy'): string => {
    return format(new Date(iso), pattern);
};

export const formatDateTime = (iso: string): string => {
    return format(new Date(iso), 'HH:mm - dd/MM/yyyy');
};

export const formatTime = (iso: string): string => {
    return format(new Date(iso), 'HH:mm');
};

export const formatRelative = (iso: string): string => {
    const date = new Date(iso);
    if (isToday(date)) return formatDistanceToNow(date, { addSuffix: true, locale: vi });
    if (isYesterday(date)) return 'Hôm qua ' + formatTime(iso);
    return formatDate(iso);
};

export const formatHour = (hour: number): string => {
    return `${String(hour).padStart(2, '0')}:00`;
};
