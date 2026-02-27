'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const saved = localStorage.getItem('theme');
        if (saved === 'dark' || saved === 'light') {
            setTheme(saved);
            document.documentElement.setAttribute('data-theme', saved);
        } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            setTheme('dark');
            document.documentElement.setAttribute('data-theme', 'dark');
        }
    }, []);

    const toggle = () => {
        const next = theme === 'light' ? 'dark' : 'light';
        setTheme(next);
        localStorage.setItem('theme', next);
        document.documentElement.setAttribute('data-theme', next);
    };

    if (!mounted) return null;

    return (
        <button
            onClick={toggle}
            className="p-2 rounded-lg transition-all duration-300 hover:bg-white/10 group"
            title={theme === 'light' ? '다크 모드' : '라이트 모드'}
            aria-label={theme === 'light' ? '다크 모드로 전환' : '라이트 모드로 전환'}
        >
            {theme === 'light' ? (
                <Moon className="w-4 h-4 text-white/60 group-hover:text-white/90 transition-colors" />
            ) : (
                <Sun className="w-4 h-4 text-amber-400/80 group-hover:text-amber-400 transition-colors" />
            )}
        </button>
    );
}
