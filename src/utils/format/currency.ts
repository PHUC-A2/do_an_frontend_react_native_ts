export const formatVND = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
    }).format(amount);
};

export const formatNumber = (value: number): string => {
    return new Intl.NumberFormat('vi-VN').format(value);
};

export const parseVND = (formatted: string): number => {
    return Number(formatted.replace(/[^0-9]/g, ''));
};
