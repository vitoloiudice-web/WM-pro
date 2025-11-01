import React from 'react';

type InputProps = React.ComponentPropsWithoutRef<'input'> & {
  label: string;
  id: string;
  error?: string;
  autoComplete?: string;
};

const Input = ({ label, id, error, autoComplete = "off", ...props }: InputProps) => {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-testo-input mb-1">
        {label}{props.required && <span className="text-red-500">*</span>}
      </label>
      <input
        id={id}
        {...props}
        autoComplete={autoComplete}
        className={`block w-full rounded-md border-black/20 bg-white text-testo-input shadow-sm focus:border-bottone-azione focus:ring-bottone-azione sm:text-sm ${
          error ? 'border-red-500 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500' : ''
        }`}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && <p id={`${id}-error`} className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
};

export default Input;