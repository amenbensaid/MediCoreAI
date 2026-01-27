import { create } from 'zustand';

export const useThemeStore = create(
    (set) => ({
        isDarkMode: localStorage.getItem('theme') === 'dark' ||
            (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches),

        toggleTheme: () => {
            set((state) => {
                const newMode = !state.isDarkMode;
                if (newMode) {
                    document.documentElement.classList.add('dark');
                    localStorage.setItem('theme', 'dark');
                } else {
                    document.documentElement.classList.remove('dark');
                    localStorage.setItem('theme', 'light');
                }
                return { isDarkMode: newMode };
            });
        },

        initializeTheme: () => {
            const isDark = localStorage.getItem('theme') === 'dark' ||
                (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
            if (isDark) {
                document.documentElement.classList.add('dark');
            }
            set({ isDarkMode: isDark });
        }
    })
);
