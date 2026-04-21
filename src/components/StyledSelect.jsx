import React, { useEffect, useMemo, useRef, useState } from 'react';
import './StyledSelect.css';

const StyledSelect = ({
  name,
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef(null);

  const selectedOption = useMemo(
    () => options.find((option) => String(option.value) === String(value)),
    [options, value]
  );

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleOutsideClick = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const handleSelect = (nextValue) => {
    setIsOpen(false);
    onChange({
      target: {
        name,
        value: nextValue
      }
    });
  };

  const handleToggle = () => {
    if (disabled) return;
    setIsOpen((prev) => !prev);
  };

  const handleKeyDown = (event) => {
    if (disabled) return;

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setIsOpen((prev) => !prev);
    }

    if (event.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div
      ref={rootRef}
      className={`styledSelect${isOpen ? ' open' : ''}${disabled ? ' disabled' : ''}${className ? ` ${className}` : ''}`}
    >
      <button
        type="button"
        className={`styledSelectTrigger${selectedOption ? '' : ' placeholder'}`}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={disabled}
      >
        <span className="styledSelectValue">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className="styledSelectChevron" aria-hidden="true" />
      </button>

      {isOpen && (
        <div className="styledSelectMenu" role="listbox" aria-label={name}>
          {options.map((option) => {
            const isSelected = String(option.value) === String(value);

            return (
              <button
                key={`${name}-${option.value}`}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`styledSelectOption${isSelected ? ' selected' : ''}${option.value === '' ? ' placeholderOption' : ''}`}
                onClick={() => handleSelect(option.value)}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StyledSelect;
