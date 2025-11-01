
import React, { useState, useEffect, useRef } from 'react';
// FIX: Updated imports to remove file extensions
import type { View } from '../types';
import { navItems } from './navigation';

interface BottomNavProps {
  currentView: View;
  setCurrentView: (view: View) => void;
}

interface NavItemProps {
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}

const NavItem = ({ label, icon, isActive, onClick }: NavItemProps) => (
  <button
    onClick={onClick}
    className={`relative flex flex-col items-center justify-center gap-1 px-2 py-2 transition-colors duration-200 ease-in-out
      focus:outline-none focus-visible:bg-white/10 rounded-md min-w-[60px]
      ${isActive 
        ? 'text-white' 
        : 'text-icone-celeste hover:text-white'
      }`}
    aria-current={isActive ? 'page' : undefined}
  >
    {icon}
    <span className="text-xs font-medium tracking-tight">{label}</span>
    {/* Active indicator bar */}
    <div
      className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-1 rounded-full bg-bottone-navbar transition-all duration-300 ease-out
        ${isActive ? 'w-8' : 'w-0'}
      `}
    />
  </button>
);

const BottomNav = ({ currentView, setCurrentView }: BottomNavProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      // Hide if scrolling down beyond the header height, show if scrolling up.
      if (currentScrollY > lastScrollY.current && currentScrollY > 70) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 bg-navbar-blu border-b border-white/10 shadow-lg md:hidden z-40
      transition-transform duration-300 ease-in-out
      ${isVisible ? 'translate-y-0' : '-translate-y-full'}`}
    >
      <div className="flex justify-between items-center max-w-4xl mx-auto px-2 sm:px-4">
        <h1 className="text-lg font-bold text-white tracking-wider">WM Pro</h1>
        <nav className="flex">
          {navItems.map((item) => (
            // FIX: Added React.Fragment with a key to resolve the TypeScript error about 'key' prop.
            <React.Fragment key={item.view}>
              <NavItem
                label={item.label}
                icon={item.icon}
                isActive={currentView === item.view}
                onClick={() => setCurrentView(item.view)}
              />
            </React.Fragment>
          ))}
        </nav>
      </div>
    </header>
  );
};

export default BottomNav;