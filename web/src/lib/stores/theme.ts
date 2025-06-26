import { writable } from 'svelte/store'
import { browser } from '$app/environment'

export type Theme = 'light' | 'dark'

function createThemeStore() {
  // Initialize with system preference or stored preference
  const getInitialTheme = (): Theme => {
    if (!browser) return 'light'

    // Check localStorage first
    const stored = localStorage.getItem('theme') as Theme | null
    if (stored && (stored === 'light' || stored === 'dark')) {
      return stored
    }

    // Fall back to system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  const initialTheme = getInitialTheme()
  const { subscribe, set, update } = writable<Theme>(initialTheme)

  // Apply theme immediately if in browser
  if (browser && initialTheme === 'dark') {
    document.documentElement.classList.add('dark')
  }

  return {
    subscribe,
    setTheme: (theme: Theme) => {
      if (browser) {
        localStorage.setItem('theme', theme)
        // Apply theme to document
        if (theme === 'dark') {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
      }
      set(theme)
    },
    toggleTheme: () => {
      update((current) => {
        const newTheme = current === 'light' ? 'dark' : 'light'
        if (browser) {
          localStorage.setItem('theme', newTheme)
          // Apply theme to document
          if (newTheme === 'dark') {
            document.documentElement.classList.add('dark')
          } else {
            document.documentElement.classList.remove('dark')
          }
        }
        return newTheme
      })
    },
    initializeTheme: () => {
      if (browser) {
        const theme = getInitialTheme()
        if (theme === 'dark') {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
        set(theme)
      }
    }
  }
}

export const theme = createThemeStore()
