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

const Select: React.FC<SelectProps> = ({ label, id, options, error, placeholder, ...props }) => {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">
        {label}{props.required && <span className="text-red-500">*</span>}
      </label>
      <select
        id={id}
        {...props}
        className={`block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
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
