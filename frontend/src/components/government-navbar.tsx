/**
 * Government Navbar Component
 * Compliant with Indian Government UX Guidelines
 */

'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Menu, X, Shield, ChevronDown, Globe, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserNav } from './user-nav';
import { useAuth } from '@/contexts/auth-context';
import { UX4GButton } from './ui/ux4g-button';
import { useTheme } from '@/components/theme-provider';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface NavItem {
  label: string;
  href: string;
  children?: { label: string; href: string }[];
}

const publicNavItems: NavItem[] = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
  { label: 'Support', href: '/support' },
];

const authenticatedNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard' },
  {
    label: 'Features',
    href: '/features',
    children: [
      { label: 'Medical Records', href: '/dashboard/records' },
      { label: 'Consent Management', href: '/dashboard/consent' },
      { label: 'Audit Trail', href: '/dashboard/audit-trail' },
    ],
  },
];

export function GovernmentNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [_textSize, _setTextSize] = useState<'small' | 'normal' | 'large'>('normal');
  const [_language, _setLanguage] = useState('en');
  const [_screenReader, setScreenReader] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { theme, setTheme } = useTheme();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const _changeTextSize = (size: 'small' | 'normal' | 'large') => {
    _setTextSize(size);
    const root = document.documentElement;
    root.classList.remove('text-small', 'text-normal', 'text-large');
    root.classList.add(`text-${size}`);
  };

  const _toggleScreenReader = () => {
    setScreenReader(!_screenReader);
    if (!_screenReader) {
      document.body.setAttribute('aria-live', 'polite');
    } else {
      document.body.removeAttribute('aria-live');
    }
  };

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b border-transparent',
        scrolled
          ? 'bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md shadow-lg border-primary/20'
          : 'bg-transparent',
      )}
    >
      {/* Main Navigation */}
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="h-12 w-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-primary/50 transition-all duration-300 group-hover:scale-105">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="font-bold text-xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                HealthLink
              </div>
              <div className="text-xs text-neutral-600 dark:text-neutral-400 font-medium">
                Digital Health Data Exchange
              </div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {(isAuthenticated ? authenticatedNavItems : publicNavItems).map((item) => (
              <div
                key={item.href}
                className="relative"
                onMouseEnter={() => item.children && setActiveDropdown(item.label)}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-1 text-sm font-medium transition-colors relative py-2',
                    'hover:text-primary',
                    'after:content-[""] after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-primary after:transition-all after:duration-300 hover:after:w-full',
                  )}
                >
                  {item.label}
                  {item.children && <ChevronDown className="h-4 w-4" />}
                </Link>

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {item.children && activeDropdown === item.label && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.2 }}
                      className="absolute top-full left-0 mt-2 w-56 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-700 py-2 overflow-hidden"
                    >
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className="block px-4 py-3 text-sm hover:bg-primary/10 hover:text-primary transition-colors"
                        >
                          {child.label}
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-4">
            {/* Accessibility Controls */}
            <div className="hidden md:flex items-center gap-2">
              {/* Theme Toggle */}
              <UX4GButton
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
              >
                {theme === 'dark' ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </UX4GButton>

              {/* Language Selector */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <UX4GButton variant="ghost" size="icon" className="rounded-full hover:bg-primary/10 hover:text-primary transition-colors">
                    <Globe className="h-5 w-5" />
                  </UX4GButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={() => _setLanguage('en')}>English</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => _setLanguage('hi')}>हिंदी</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => _setLanguage('te')}>తెలుగు</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {isAuthenticated ? (
              <UserNav />
            ) : (
              <div className="hidden md:flex items-center gap-3">
                <Link href="/login" className="text-sm font-medium hover:text-primary transition-colors">
                  Login
                </Link>
                <UX4GButton size="sm" className="rounded-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity shadow-lg shadow-primary/25" asChild>
                  <Link href="/signup">Get Started</Link>
                </UX4GButton>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-neutral-200 dark:border-neutral-800 overflow-hidden bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl"
            >
              <div className="py-4 space-y-4 px-4">
                {(isAuthenticated ? authenticatedNavItems : publicNavItems).map((item) => (
                  <div key={item.href}>
                    <Link
                      href={item.href}
                      className="block py-2 text-base font-medium hover:text-primary transition-colors"
                      onClick={() => !item.children && setMobileMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                    {item.children && (
                      <div className="ml-4 mt-2 space-y-2 border-l-2 border-neutral-100 dark:border-neutral-800 pl-4">
                        {item.children.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            className="block py-2 text-sm text-neutral-600 dark:text-neutral-400 hover:text-primary transition-colors"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {!isAuthenticated && (
                  <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 grid grid-cols-2 gap-4">
                    <UX4GButton variant="secondary" className="w-full" asChild>
                      <Link href="/login" onClick={() => setMobileMenuOpen(false)}>Login</Link>
                    </UX4GButton>
                    <UX4GButton className="w-full bg-gradient-to-r from-primary to-secondary" asChild>
                      <Link href="/signup" onClick={() => setMobileMenuOpen(false)}>Sign Up</Link>
                    </UX4GButton>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
}
