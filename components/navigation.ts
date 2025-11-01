import React from 'react';
// FIX: Updated imports to remove file extensions
import type { View } from '../types';
import { HomeIcon, AcademicCapIcon, UsersIcon, CurrencyDollarIcon, WrenchScrewdriverIcon, ChartPieIcon, MegaphoneIcon, Cog6ToothIcon } from './icons/HeroIcons';

export interface NavItemConfig {
  view: View;
  label: string;
  icon: React.ReactNode;
}

export const navItems: NavItemConfig[] = [
  { view: 'dashboard', label: 'Dashboard', icon: React.createElement(HomeIcon, { className: 'h-5 w-5' }) },
  { view: 'clients', label: 'Clienti', icon: React.createElement(UsersIcon, { className: 'h-5 w-5' }) },
  { view: 'logistics', label: 'Logistica', icon: React.createElement(WrenchScrewdriverIcon, { className: 'h-5 w-5' }) },
  { view: 'workshops', label: 'Workshops', icon: React.createElement(AcademicCapIcon, { className: 'h-5 w-5' }) },
  { view: 'finance', label: 'Finanze', icon: React.createElement(CurrencyDollarIcon, { className: 'h-5 w-5' }) },
  { view: 'reports', label: 'Report', icon: React.createElement(ChartPieIcon, { className: 'h-5 w-5' }) },
  { view: 'campagne', label: 'Campagne', icon: React.createElement(MegaphoneIcon, { className: 'h-5 w-5' }) },
  { view: 'impostazioni', label: 'Impostazioni', icon: React.createElement(Cog6ToothIcon, { className: 'h-5 w-5' }) },
];