/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
    theme: {
        extend: {
            colors: {
                primary: {
                    50: '#eff6ff',
                    100: '#dbeafe',
                    200: '#bfdbfe',
                    300: '#93c5fd',
                    400: '#60a5fa',
                    500: '#3b82f6',
                    600: '#2563eb',
                    700: '#1d4ed8',
                    800: '#1e40af',
                    900: '#1e3a8a',
                },
                gray: {
                    50: '#f9fafb',
                    100: '#f3f4f6',
                    200: '#e5e7eb',
                    300: '#d1d5db',
                    400: '#9ca3af',
                    500: '#6b7280',
                    600: '#4b5563',
                    700: '#374151',
                    800: '#1f2937',
                    900: '#111827',
                }
            },
            boxShadow: {
                card: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                dropdown: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                button: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            },
            borderRadius: {
                DEFAULT: '0.375rem',
            },
            fontSize: {
                xs: ['0.75rem', {
                    lineHeight: '1rem'
                }],
                sm: ['0.875rem', {
                    lineHeight: '1.25rem'
                }],
                base: ['1rem', {
                    lineHeight: '1.5rem'
                }],
                lg: ['1.125rem', {
                    lineHeight: '1.75rem'
                }],
                xl: ['1.25rem', {
                    lineHeight: '1.75rem'
                }],
                '2xl': ['1.5rem', {
                    lineHeight: '2rem'
                }],
                '3xl': ['1.875rem', {
                    lineHeight: '2.25rem'
                }],
            },
            animation: {
                'fade-in': 'fadeIn 0.3s ease-in-out',
            },
            keyframes: {
                fadeIn: {
                    '0%': {
                        opacity: '0',
                        transform: 'translateY(5px)'
                    },
                    '100%': {
                        opacity: '1',
                        transform: 'translateY(0)'
                    },
                },
            },
        },
    },
    plugins: [],
};