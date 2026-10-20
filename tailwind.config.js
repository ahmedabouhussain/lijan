/**
 * Colour policy: status and emphasis use the semantic `state-*` tokens and the
 * institutional tokens (primary, accent, muted, border). Blue, sky, cyan, teal, indigo,
 * violet, purple, pink and fuchsia are not part of the LIJAN identity and are not used
 * anywhere in the platform source.
 */

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
  			sm: 'calc(var(--radius) - 4px)',
  			xs: 'var(--radius-xs)',
  			control: 'var(--radius-control)',
  			card: 'var(--card-radius)',
  			pill: 'var(--radius-pill)'
  		},
  		/* The only spacing steps the platform adds to the stock scale. */
  		spacing: {
  			gutter: 'var(--space-gutter)',
  			stack: 'var(--space-stack)',
  			section: 'var(--space-section)'
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
  			/* Ceremonial gold as its own role — plates, hairlines, ceremonial emphasis. */
  			gold: {
  				DEFAULT: 'hsl(var(--gold))',
  				ink: 'hsl(var(--gold-ink))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			/* Complete colour value — carries its own alpha for both modes. */
  			scrim: 'var(--scrim)',
  			/* Glass — complete colour values, never wrapped in hsl(): the token carries its own. */
  			glass: {
  				DEFAULT: 'var(--glass-surface)',
  				strong: 'var(--glass-surface-strong)',
  				border: 'var(--glass-border)'
  			},
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
  		backdropBlur: {
  			glass: 'var(--glass-blur)'
  		},
  		boxShadow: {
  			'elevation-1': 'var(--elevation-1)',
  			'elevation-2': 'var(--elevation-2)',
  			'elevation-3': 'var(--elevation-3)',
  			overlay: 'var(--elevation-overlay)',
  			/* The glass surface's own lift: elevation plus its specular top rim. */
  			surface: 'var(--elevation-1), inset 0 1px 0 var(--glass-highlight)'
  		},
  		transitionTimingFunction: {
  			sovereign: 'var(--ease-sovereign)'
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
  			'lijan-rise': {
  				from: { opacity: '0', transform: 'translateY(6px)' },
  				to: { opacity: '1', transform: 'none' }
  			},
  			'lijan-fade': {
  				from: { opacity: '0' },
  				to: { opacity: '1' }
  			},
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
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			'lijan-rise': 'lijan-rise var(--dur-enter) var(--ease-sovereign) both',
  			'lijan-fade': 'lijan-fade var(--dur-base) var(--ease-sovereign) both'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}
