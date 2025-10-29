import React from 'react';
import type { View } from '../types.ts';
import { HomeIcon, AcademicCapIcon, UsersIcon, CurrencyDollarIcon, WrenchScrewdriverIcon, ChartPieIcon } from './icons/HeroIcons.tsx';

export interface NavItemConfig {
  view: View;
  label: string;
  icon: React.ReactNode;
}

export const navItems: NavItemConfig[] = [
  { view: 'dashboard', label: 'Dashboard', icon: React.createElement(HomeIcon, { className: 'h-5 w-5' }) },
  { view: 'workshops', label: 'Workshops', icon: React.createElement(AcademicCapIcon, { className: 'h-5 w-5' }) },
  { view: 'clients', label: 'Clienti', icon: React.createElement(UsersIcon, { className: 'h-5 w-5' }) },
  { view: 'finance', label: 'Finanze', icon: React.createElement(CurrencyDollarIcon, { className: 'h-5 w-5' }) },
  { view: 'reports', label: 'Report', icon: React.createElement(ChartPieIcon, { className: 'h-5 w-5' }) },
  { view: 'logistics', label: 'Logistica', icon: React.createElement(WrenchScrewdriverIcon, { className: 'h-5 w-5' }) },
];