import React, { useState, useEffect, useRef, useMemo } from "react";

const FormDropDownQuestion = ({
  id = "",
  title = "",
  description = "",
  options = [],
  value = "",
  onChange = () => {},
}) => {
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listboxId = useMemo(
    () => `${id || "dropdown"}-options`,
    [id]
  );
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [checked, setChecked] = useState(value);
  const [activeIndex, setActiveIndex] = useState(0);

  const findOptionByKey = (optionKey) =>
    options.find((option) => option.option === optionKey);

  const syncSelection = (option) => {
    if (option) {
      setChecked(option.option);
      setSearchTerm(option.label);
    } else {
      setChecked("");
      setSearchTerm("");
    }
  };

  useEffect(() => {
    syncSelection(findOptionByKey(value));
  }, [value, options]);

  const filteredOptions = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return options;
    }
    return options.filter((option) =>
      option.label.toLowerCase().includes(query)
    );
  }, [options, searchTerm]);

  useEffect(() => {
    if (activeIndex > filteredOptions.length - 1) {
      setActiveIndex(0);
    }
  }, [filteredOptions, activeIndex]);

  const handleOptionSelected = (option) => {
    if (!option) return;
    syncSelection(option);
    setIsOpen(false);
    setActiveIndex(0);
    onChange(id, option.value, option.option);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
        const selected = findOptionByKey(checked);
        syncSelection(selected);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [checked, options]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleInputChange = (event) => {
    setSearchTerm(event.target.value);
    setIsOpen(true);
    setActiveIndex(0);
  };

  const handleToggle = () => {
    setIsOpen((prev) => {
      const next = !prev;
      if (!next) {
        const selected = findOptionByKey(checked);
        syncSelection(selected);
      }
      return next;
    });
  };

  const handleKeyDown = (event) => {
    if (!isOpen && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      setIsOpen(true);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) =>
        Math.min(prev + 1, Math.max(filteredOptions.length - 1, 0))
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      handleOptionSelected(filteredOptions[activeIndex]);
    } else if (event.key === "Escape") {
      setIsOpen(false);
      const selected = findOptionByKey(checked);
      syncSelection(selected);
    }
  };

  return (
    <div
      ref={containerRef}
      className={"dynamic-form-field dynamic-form-dropdown-question"}
    >
      <p
        dangerouslySetInnerHTML={{ __html: title }}
        className="dynamic-form-field-question-title"
      />
      {description && (
        <p
          dangerouslySetInnerHTML={{ __html: description }}
          className="dynamic-form-field-question-description"
        />
      )}
      <div className="dynamic-form-dropdown-question-options-wrapper">
        <div
          className="dynamic-form-combobox"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-owns={listboxId}
        >
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            placeholder="Search and select…"
            onChange={handleInputChange}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            aria-controls={listboxId}
            aria-autocomplete="list"
          />
          <button
            type="button"
            aria-label={isOpen ? "Collapse list" : "Expand list"}
            onClick={handleToggle}
          >
            ▾
          </button>
          {isOpen && (
            <ul
              id={listboxId}
              role="listbox"
              className="dynamic-form-select-field-options"
            >
              {filteredOptions.length === 0 ? (
                <li className="dynamic-form-select-field-options-empty">
                  No matches found
                </li>
              ) : (
                filteredOptions.map((option, index) => {
                  const isSelected = checked === option.option;
                  const isActive = index === activeIndex;

                  return (
                    <li
                      key={option.option}
                      role="option"
                      aria-selected={isSelected}
                      className={[
                        isSelected
                          ? "dynamic-form-select-field-option-active"
                          : "",
                        isActive
                          ? "dynamic-form-select-field-option-highlight"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onMouseDown={(event) => event.preventDefault()}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => handleOptionSelected(option)}
                    >
                      {option.label}
                    </li>
                  );
                })
              )}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default FormDropDownQuestion;
