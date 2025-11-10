/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}"
  ],
  darkMode: ["class", "class"],
  theme: {
  	extend: {
  		colors: {
  			primary: {
  				'50': '#E6F3FF',
  				'100': '#CCE7FF',
  				'200': '#99CFFF',
  				'300': '#66B7FF',
  				'400': '#339FFF',
  				'500': '#0373FE',
  				'600': '#0256C4',
  				'700': '#023D91',
  				'800': '#01245D',
  				'900': '#010B2E',
  				DEFAULT: 'hsl(var(--primary))',
  				light: '#2D8CFF',
  				dark: '#0256C4',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				light: '#1E293B',
  				dark: '#020617',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			action: {
  				success: '#10B981',
  				warning: '#F59E0B',
  				danger: '#EF4444',
  				info: '#06B6D4'
  			},
  			complementary: {
  				orange: '#FF6B35',
  				coral: '#FF8C69',
  				purple: '#A78BFA',
  				pink: '#EC4899',
  				teal: '#14B8A6',
  				amber: '#FBBF24'
  			},
  			background: 'hsl(var(--background))',
  			surface: {
  				light: '#F5F6F9',
  				dark: '#131C2E',
  				elevated: {
  					light: '#FFFFFF',
  					dark: '#1E293B'
  				}
  			},
  			text: {
  				light: '#0F172A',
  				dark: '#F8FAFC'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				soft: '#DEF8EC',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			'accent-muted': '#DEF8EC',
  			border: 'hsl(var(--border))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
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
  		fontFamily: {
  			sans: [
  				'Inter',
  				'Satoshi',
  				'system-ui',
  				'sans-serif'
  			]
  		},
  		boxShadow: {
  			'depth-sm': '0 2px 4px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.1)',
  			'depth-md': '0 4px 8px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.06)',
  			'depth-lg': '0 8px 16px rgba(0, 0, 0, 0.1), 0 4px 8px rgba(0, 0, 0, 0.06)',
  			'depth-xl': '0 16px 32px rgba(0, 0, 0, 0.12), 0 8px 16px rgba(0, 0, 0, 0.08)',
  			'depth-2xl': '0 24px 48px rgba(0, 0, 0, 0.15), 0 12px 24px rgba(0, 0, 0, 0.1)',
  			'depth-3xl': '0 32px 64px rgba(0, 0, 0, 0.18), 0 16px 32px rgba(0, 0, 0, 0.12)',
  			'glow-primary': '0 0 20px rgba(3, 115, 254, 0.3), 0 0 40px rgba(3, 115, 254, 0.1)',
  			'glow-complementary': '0 0 20px rgba(255, 107, 53, 0.3), 0 0 40px rgba(255, 107, 53, 0.1)',
  			'glow-success': '0 0 20px rgba(16, 185, 129, 0.3), 0 0 40px rgba(16, 185, 129, 0.1)',
  			'inner-depth': 'inset 0 2px 4px rgba(0, 0, 0, 0.1)'
  		},
  		keyframes: {
  			'fade-in': {
  				'0%': {
  					opacity: '0',
  					transform: 'translateY(10px)'
  				},
  				'100%': {
  					opacity: '1',
  					transform: 'translateY(0)'
  				}
  			},
  			'fade-in-up': {
  				'0%': {
  					opacity: '0',
  					transform: 'translateY(20px)'
  				},
  				'100%': {
  					opacity: '1',
  					transform: 'translateY(0)'
  				}
  			},
  			'fade-in-down': {
  				'0%': {
  					opacity: '0',
  					transform: 'translateY(-20px)'
  				},
  				'100%': {
  					opacity: '1',
  					transform: 'translateY(0)'
  				}
  			},
  			'slide-in': {
  				'0%': {
  					transform: 'translateX(-100%)'
  				},
  				'100%': {
  					transform: 'translateX(0)'
  				}
  			},
  			'slide-in-right': {
  				'0%': {
  					opacity: '0',
  					transform: 'translateX(50px)'
  				},
  				'100%': {
  					opacity: '1',
  					transform: 'translateX(0)'
  				}
  			},
  			'slide-in-left': {
  				'0%': {
  					opacity: '0',
  					transform: 'translateX(-50px)'
  				},
  				'100%': {
  					opacity: '1',
  					transform: 'translateX(0)'
  				}
  			},
  			'scale-in': {
  				'0%': {
  					transform: 'scale(0.9)',
  					opacity: '0'
  				},
  				'100%': {
  					transform: 'scale(1)',
  					opacity: '1'
  				}
  			},
  			float: {
  				'0%, 100%': {
  					transform: 'translateY(0)'
  				},
  				'50%': {
  					transform: 'translateY(-10px)'
  				}
  			},
  			'pulse-glow': {
  				'0%, 100%': {
  					opacity: '1',
  					boxShadow: '0 0 20px rgba(3, 115, 254, 0.3)'
  				},
  				'50%': {
  					opacity: '0.8',
  					boxShadow: '0 0 40px rgba(3, 115, 254, 0.5)'
  				}
  			},
  			shimmer: {
  				'0%': {
  					backgroundPosition: '-200% 0'
  				},
  				'100%': {
  					backgroundPosition: '200% 0'
  				}
  			},
  			'bounce-subtle': {
  				'0%, 100%': {
  					transform: 'translateY(0)'
  				},
  				'50%': {
  					transform: 'translateY(-5px)'
  				}
  			}
  		},
  		animation: {
  			'fade-in': 'fade-in 0.5s ease-out',
  			'fade-in-up': 'fade-in-up 0.6s ease-out',
  			'fade-in-down': 'fade-in-down 0.6s ease-out',
  			'slide-in': 'slide-in 0.4s ease-out',
  			'slide-in-right': 'slide-in-right 0.5s ease-out',
  			'slide-in-left': 'slide-in-left 0.5s ease-out',
  			'scale-in': 'scale-in 0.3s ease-out',
  			float: 'float 3s ease-in-out infinite',
  			'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
  			shimmer: 'shimmer 2s linear infinite',
  			'bounce-subtle': 'bounce-subtle 2s ease-in-out infinite'
  		},
  		backdropBlur: {
  			xs: '2px'
  		},
  		transitionTimingFunction: {
  			'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")]
}
