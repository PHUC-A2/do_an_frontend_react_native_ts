module.exports = function (api) {
    api.cache(true);
    return {
        presets: ['babel-preset-expo'],
        plugins: [
            [
                'module-resolver',
                {
                    root: ['.'],
                    alias: {
                        '@': './src',
                        '@components': './src/components',
                        '@screens': './src/screens',
                        '@navigation': './src/navigation',
                        '@redux': './src/redux',
                        '@services': './src/services',
                        '@hooks': './src/hooks',
                        '@utils': './src/utils',
                        '@config': './src/config',
                        '@i18n': './src/i18n',
                        '@assets': './src/assets',
                    },
                },
            ],
            'react-native-reanimated/plugin',
        ],
    };
};
