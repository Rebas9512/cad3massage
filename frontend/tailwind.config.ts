import type { Config } from 'tailwindcss';

// Sage & Cream — tokens from Design Plan & Screens.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#F5F1E8',
        surface: '#FFFFFF',
        sage: '#6B8F71',
        'sage-deep': '#557A5E',
        soft: '#A9C0AE',
        forest: '#2F3E34',
        clay: '#CBA98C',
        ink: '#283027',
        text: '#5C6157',
        muted: '#8C9085',
        line: '#E4DECF',
        'on-dark': '#F1ECE0',
        'on-dark-muted': '#B9C4B5',
        avail: '#C6E5C0',
        unavail: '#ECEAE2',
      },
      fontFamily: {
        heading: ['Fraunces', 'Georgia', 'serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"Roboto Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: { sm: '10px', md: '16px', lg: '24px', pill: '999px' },
      maxWidth: { content: '1200px' },
    },
  },
  plugins: [],
} satisfies Config;
