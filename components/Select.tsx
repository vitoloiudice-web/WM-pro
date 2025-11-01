import React from 'react';

type SelectOption = {
  value: string | number;
  label: string;
};

type SelectProps = React.ComponentPropsWithoutRef<'select'> & {
  label: string;
  id: string;
  options: SelectOption[];
  error?: string;
  placeholder?: string;
};

const Select = ({ label, id, options, error, placeholder, ...props }: SelectProps) => {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-testo-input mb-1">
        {label}{props.required && <span className="text-red-500">*</span>}
      </label>
      <select
        id={id}
        {...props}
        className={`block w-full rounded-md border-black/20 bg-white text-testo-input shadow-sm focus:border-bottone-azione focus:ring-bottone-azione sm:text-sm ${
          error ? 'border-red-500 text-red-900 focus:border-red-500 focus:ring-red-500' : ''
        }`}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p id={`${id}-error`} className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
};

export default Select;