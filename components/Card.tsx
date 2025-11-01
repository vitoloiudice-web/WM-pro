
import React from 'react';

interface CardProps {
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

const Card = ({ children, className, onClick }: CardProps) => {
  const baseClasses = "bg-cards-giallo rounded-xl shadow-md overflow-hidden transition-shadow duration-300";
  const clickableClasses = onClick ? "cursor-pointer hover:shadow-lg hover:ring-2 hover:ring-bottone-azione/50" : "";
  
  return (
    <div className={`${baseClasses} ${clickableClasses} ${className}`} onClick={onClick}>
      {children}
    </div>
  );
};

export const CardHeader = ({ children, actions }: { children?: React.ReactNode, actions?: React.ReactNode }) => (
  <div className="p-4 sm:p-6 border-b border-black/10 flex justify-between items-center">
    <h3 className="text-lg font-semibold text-testo-input">{children}</h3>
    {actions && <div className="flex items-center space-x-2">{actions}</div>}
  </div>
);

export const CardContent = ({ children, className }: { children?: React.ReactNode; className?: string }) => (
  <div className={`p-4 sm:p-6 ${className}`}>
    {children}
  </div>
);

export const CardFooter = ({ children }: { children?: React.ReactNode }) => (
  <div className="p-4 sm:p-6 border-t border-black/10">
    {children}
  </div>
);

export default Card;