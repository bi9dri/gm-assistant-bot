import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

interface Option {
  id: string;
  label: string;
  isDisabled?: boolean;
  disabledReason?: string;
}

interface PortaledSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const INITIAL_POSITION = { top: 0, left: 0, width: 0 };

export function PortaledSelect({
  options,
  value,
  onChange,
  placeholder = "選択してください",
  disabled = false,
  className = "",
}: PortaledSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState(INITIAL_POSITION);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  const updatePosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 2,
        left: rect.left,
        width: rect.width,
      });
    }
  }, []);

  const handleToggle = () => {
    if (disabled) return;
    if (isOpen) {
      setIsOpen(false);
    } else {
      updatePosition();
      setIsOpen(true);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        menuRef.current?.contains(e.target as Node)
      ) {
        return;
      }
      setIsOpen(false);
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    const handleScroll = (e: Event) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      setIsOpen(false);
    };

    const handleResize = () => {
      setIsOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("scroll", handleScroll, { capture: true, passive: true });
    window.addEventListener("resize", handleResize);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [isOpen]);

  const selectedLabel = options.find((o) => o.id === value)?.label;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`nodrag btn btn-sm justify-between ${className}`}
      >
        <span className="truncate">{selectedLabel || placeholder}</span>
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen &&
        createPortal(
          <>
            <div className="fixed inset-0 z-9998" onClick={() => setIsOpen(false)} />
            <ul
              ref={menuRef}
              className="menu flex-nowrap bg-base-100 shadow-lg rounded-box border border-base-300 z-9999 max-h-48 overflow-y-auto"
              style={{
                position: "fixed",
                top: position.top,
                left: position.left,
                width: position.width,
                minWidth: "150px",
              }}
            >
              {options.map((opt) => (
                <li key={opt.id}>
                  <button
                    type="button"
                    disabled={opt.isDisabled}
                    className={opt.isDisabled ? "opacity-50" : ""}
                    onClick={() => {
                      if (!opt.isDisabled) {
                        onChange(opt.id);
                        setIsOpen(false);
                      }
                    }}
                  >
                    {opt.label || "(未入力)"}
                    {opt.isDisabled && opt.disabledReason && (
                      <span className="text-xs opacity-70">({opt.disabledReason})</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </>,
          document.body,
        )}
    </>
  );
}
