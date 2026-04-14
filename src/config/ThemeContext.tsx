import React, { createContext, useCallback, useContext, useState } from 'react';
import { useColorScheme } from 'react-native';
import { LIGHT_COLORS, DARK_COLORS } from './theme';

type ColorSet = typeof LIGHT_COLORS | typeof DARK_COLORS;
type ThemeMode = 'system' | 'light' | 'dark';

export type AppColors = {
    [K in keyof typeof LIGHT_COLORS]: string;
};

interface ThemeContextValue {
    colors: AppColors;
    isDark: boolean;
    mode: ThemeMode;
    setMode: (mode: ThemeMode) => void;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
    colors: DARK_COLORS as AppColors,
    isDark: true,
    mode: 'dark',
    setMode: () => { },
    toggleTheme: () => { },
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const systemScheme = useColorScheme();
    const [mode, setMode] = useState<ThemeMode>('dark');

    const isDark =
        mode === 'system' ? systemScheme === 'dark' : mode === 'dark';

    const colors: AppColors = isDark ? DARK_COLORS : LIGHT_COLORS;

    const toggleTheme = useCallback(() => {
        setMode((prev) => {
            if (prev === 'system') return isDark ? 'light' : 'dark';
            return prev === 'dark' ? 'light' : 'dark';
        });
    }, [isDark]);

    return (
        <ThemeContext.Provider value={{ colors, isDark, mode, setMode, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme(): ThemeContextValue {
    return useContext(ThemeContext);
}
