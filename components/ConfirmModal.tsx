import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
// FIX: Removed .tsx extension from import path.
import { XIcon } from './icons/HeroIcons';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  children?: React.ReactNode;
}

export const ConfirmModal = ({ isOpen, onClose, onConfirm, title, children }: ConfirmModalProps) => {
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4"
      aria-modal="true"
      role="dialog"
    >
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      ></div>
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md z-50 animate-fade-in-up">
        <div className="flex justify-between items-center p-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-testo-input">{title}</h3>
          <button
            onClick={onClose}
            className="text-testo-input/70 hover:text-testo-input p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-bottone-azione"
            aria-label="Close"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 text-sm text-testo-input/90">
          {children}
        </div>
        <div className="flex justify-end items-center p-4 bg-slate-50 border-t border-slate-200 rounded-b-lg space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-bottone-annullamento text-testo-input rounded-md hover:opacity-90 text-sm font-medium"
          >
            Annulla
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-bottone-eliminazione text-white rounded-md hover:opacity-90 text-sm font-medium"
          >
            Conferma
          </button>
        </div>
        <style>{`
            @keyframes fade-in-up {
              from { opacity: 0; transform: translateY(20px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .animate-fade-in-up {
              animation: fade-in-up 0.3s ease-out forwards;
            }
        `}</style>
      </div>
    </div>
  );

  const modalRoot = document.getElementById('modal-root');
  return modalRoot ? ReactDOM.createPortal(modalContent, modalRoot) : null;
};