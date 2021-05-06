module.exports = {
    preset: 'ts-jest',
    roots: [
        '<rootDir>',
    ],
    testMatch: [
        '**/__tests__/**/?(*.)+(itest|itests).+(ts|tsx|js)',
    ],
    transform: {
        '^.+\\.(ts|tsx)$': 'ts-jest',
    },
    testEnvironment: 'node',
    moduleDirectories: ['node_modules', 'src'],
    moduleNameMapper: {
        '@src/(.*)': '<rootDir>/src/$1',
    },
    globals: {
        navigator: {},
    },
    setupFiles: ['<rootDir>/.jest/setEnvVars.js'],
};
