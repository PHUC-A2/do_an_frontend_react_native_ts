import Toast from 'react-native-toast-message';

export function useToast() {
    const success = (message: string, title = 'Thành công') => {
        Toast.show({ type: 'success', text1: title, text2: message });
    };

    const error = (message: string, title = 'Lỗi') => {
        Toast.show({ type: 'error', text1: title, text2: message });
    };

    const info = (message: string, title = 'Thông báo') => {
        Toast.show({ type: 'info', text1: title, text2: message });
    };

    return { success, error, info };
}
