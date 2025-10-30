
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

const Card: React.FC<CardProps> = ({ children, className, onClick }) => {
  const baseClasses = "bg-white rounded-xl shadow-md overflow-hidden transition-shadow duration-300";
  const clickableClasses = onClick ? "cursor-pointer hover:shadow-lg hover:ring-2 hover:ring-indigo-500/50" : "";
  
  return (
    <div className={`${baseClasses} ${clickableClasses} ${className}`} onClick={onClick}>
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{ children: React.ReactNode, actions?: React.ReactNode }> = ({ children, actions }) => (
  <div className="p-4 sm:p-6 border-b border-slate-200 flex justify-between items-center">
    <h3 className="text-lg font-semibold text-slate-800">{children}</h3>
    {actions && <div className="flex items-center space-x-2">{actions}</div>}
  </div>
);

export const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={`p-4 sm:p-6 ${className}`}>
    {children}
  </div>
);

export const CardFooter: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-200">
    {children}
  </div>
);

export default Card;
