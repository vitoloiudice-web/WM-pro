import React from 'react';

type InputProps = React.ComponentPropsWithoutRef<'input'> & {
  label: string;
  id: string;
  error?: string;
};

const Input: React.FC<InputProps> = ({ label, id, error, ...props }) => {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">
        {label}
      </label>
      <input
        id={id}
        {...props}
        className={`block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
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