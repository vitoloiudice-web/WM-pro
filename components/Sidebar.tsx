import React from 'react';
// FIX: Updated imports to remove file extensions
import type { View } from '../types';
import { navItems, NavItemConfig } from './navigation';

interface SidebarProps {
  currentView: View;
  setCurrentView: (view: View) => void;
}

interface NavItemProps {
  item: NavItemConfig;
  isActive: boolean;
  onClick: () => void;
}

const NavItem = ({ item, isActive, onClick }: NavItemProps) => (
  <button
    onClick={onClick}
    className={`group flex items-center w-full px-3 py-3 text-sm font-medium rounded-md transition-colors duration-150
      ${
        isActive
          ? 'bg-bottone-navbar text-white'
          : 'text-icone-celeste hover:bg-white/10 hover:text-white'
      }`}
    aria-current={isActive ? 'page' : undefined}
  >
    <div className={`mr-3 h-6 w-6 ${isActive ? 'text-white' : 'text-icone-celeste group-hover:text-white'}`}>
      {item.icon}
    </div>
    <span>{item.label}</span>
  </button>
);

const Sidebar = ({ currentView, setCurrentView }: SidebarProps) => {
  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
      <div className="flex flex-col flex-grow bg-navbar-blu pt-5 overflow-y-auto">
        <div className="flex items-center flex-shrink-0 px-4">
          <h2 className="text-xl font-bold text-white tracking-wider">W M Pro</h2>
        </div>
        <nav className="mt-8 flex-1 px-2 space-y-1">
          <ul>
            {navItems.map((item) => (
              <li key={item.view}>
                <NavItem
                  item={item}
                  isActive={currentView === item.view}
                  onClick={() => setCurrentView(item.view)}
                />
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;