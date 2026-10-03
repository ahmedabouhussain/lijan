/**
 * Deprecated hue families — NOT part of the LIJAN identity.
 *
 * Blue, sky, cyan, teal, indigo, violet, purple, pink and fuchsia are forbidden as
 * decorative or status colours. Their scales are remapped onto the institutional warm
 * neutral ramp so that no such colour can render anywhere on the platform, including
 * class names assembled at runtime that a source scan cannot see. New work must use the
 * semantic `state-*` tokens (state-success-ink, state-warning-surface, …) instead.
 */
const DEPRECATED_HUE_RAMP = {
  50: '#F3F0EA',
  100: '#EBE6DD',
  200: '#DCD5C8',
  300: '#C9C0AF',
  400: '#A9A196',
  500: '#8A8378',
  600: '#6E7377',
  700: '#4A4F53',
  800: '#3A3F43',
  900: '#2A2E31',
  950: '#1F2123',
};

/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
  	extend: {
  		opacity: Object.fromEntries(Array.from({ length: 101 }, (_, i) => [i, `${i / 100}`])),
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))',
  				dark: 'hsl(var(--primary-dark))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			/* Semantic state palette — the single vocabulary for status surfaces. */
  			state: {
  				neutral: { surface: 'hsl(var(--state-neutral-surface))', ink: 'hsl(var(--state-neutral-ink))' },
  				info: { surface: 'hsl(var(--state-info-surface))', ink: 'hsl(var(--state-info-ink))' },
  				progress: { surface: 'hsl(var(--state-progress-surface))', ink: 'hsl(var(--state-progress-ink))' },
  				success: { surface: 'hsl(var(--state-success-surface))', ink: 'hsl(var(--state-success-ink))' },
  				warning: { surface: 'hsl(var(--state-warning-surface))', ink: 'hsl(var(--state-warning-ink))' },
  				danger: { surface: 'hsl(var(--state-danger-surface))', ink: 'hsl(var(--state-danger-ink))' },
  				ceremonial: { surface: 'hsl(var(--state-ceremonial-surface))', ink: 'hsl(var(--state-ceremonial-ink))' }
  			},
  			/* Legacy hue families remapped to institutional neutrals (see DEPRECATED_HUE_RAMP). */
  			sky: DEPRECATED_HUE_RAMP,
  			blue: DEPRECATED_HUE_RAMP,
  			cyan: DEPRECATED_HUE_RAMP,
  			teal: DEPRECATED_HUE_RAMP,
  			indigo: DEPRECATED_HUE_RAMP,
  			violet: DEPRECATED_HUE_RAMP,
  			purple: DEPRECATED_HUE_RAMP,
  			fuchsia: DEPRECATED_HUE_RAMP,
  			pink: DEPRECATED_HUE_RAMP,
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		fontFamily: {
  			heading: ['var(--font-heading)'],
  			body: ['var(--font-body)'],
  			display: ['var(--font-display)'],
  			arabic: ['var(--font-arabic)'],
  			mono: ['var(--font-mono)']
  		},
  		lineHeight: {
  			'arabic-body': '1.55',
  			'arabic-compact': '1.4',
  			'arabic-heading': '1.25'
  		},
  		fontWeight: {
  			label: '500',
  			subheading: '600'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}
