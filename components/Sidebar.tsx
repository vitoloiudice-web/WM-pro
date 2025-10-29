import React from 'react';
import type { View } from '../types.ts';
import { navItems, NavItemConfig } from './navigation.ts';

interface SidebarProps {
  currentView: View;
  setCurrentView: (view: View) => void;
}

const NavItem: React.FC<{
  item: NavItemConfig;
  isActive: boolean;
  onClick: () => void;
}> = ({ item, isActive, onClick }) => (
  <li>
    <button
      onClick={onClick}
      className={`group flex items-center w-full px-3 py-3 text-sm font-medium rounded-md transition-colors duration-150
        ${
          isActive
            ? 'bg-indigo-600 text-white'
            : 'text-slate-300 hover:bg-slate-700 hover:text-white'
        }`}
      aria-current={isActive ? 'page' : undefined}
    >
      <div className={`mr-3 h-6 w-6 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-300'}`}>
        {item.icon}
      </div>
      <span>{item.label}</span>
    </button>
  </li>
);

const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView }) => {
  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
      <div className="flex flex-col flex-grow bg-slate-800 pt-5 overflow-y-auto">
        <div className="flex items-center flex-shrink-0 px-4">
          <h2 className="text-xl font-bold text-white tracking-wider">W M Pro</h2>
        </div>
        <nav className="mt-8 flex-1 px-2 space-y-1">
          <ul>
            {navItems.map((item) => (
              <NavItem
                key={item.view}
                item={item}
                isActive={currentView === item.view}
                onClick={() => setCurrentView(item.view)}
              />
            ))}
          </ul>
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;