/**
 * PortaledSelect - React Flowノード内で使用するためのselectコンポーネント
 *
 * ## なぜこのコンポーネントが必要か
 *
 * React Flowはノードに `transform: translate3d(x, y, 0) scale(zoom)` を適用して
 * ズーム・パン機能を実装している。CSSの仕様により、`transform`プロパティを持つ要素は
 * 新しいstacking contextを作成し、その子孫の`position: absolute/fixed`の
 * 計算基準が変わってしまう。
 *
 * そのため、通常の<select>やDaisyUIのselectコンポーネントを使うと、
 * ドロップダウンメニューがノードから離れた位置に表示されるバグが発生する。
 *
 * ## このコンポーネントの解決策
 *
 * React Portalを使用してドロップダウンメニューを`document.body`直下にレンダリングし、
 * React Flowのtransformの影響を受けないようにする。
 *
 * ## いつ使うべきか
 *
 * - React Flowノード内でドロップダウン選択UIが必要な場合
 * - transformが適用された親要素の中でドロップダウンを使う場合
 *
 * ## いつ使わなくてよいか
 *
 * - React Flowノード外での通常のselect（DaisyUIのselectで十分）
 * - ラジオボタンやチェックボックスで代替できる場合（そちらの方がシンプル）
 */

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

export function PortaledSelect({
  options,
  value,
  onChange,
  placeholder = "選択してください",
  disabled = false,
  className = "",
}: PortaledSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  // 位置を計算
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

  // トグル動作
  const handleToggle = () => {
    if (disabled) return;
    if (isOpen) {
      setIsOpen(false);
    } else {
      updatePosition();
      setIsOpen(true);
    }
  };

  // 各種イベントで閉じる
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

    const handleScroll = () => {
      setIsOpen(false);
    };

    const handleResize = () => {
      setIsOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [isOpen]);

  // 選択された項目のラベルを取得
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
            {/* 背景オーバーレイ - クリックで閉じる */}
            <div
              className="fixed inset-0 z-9998"
              onClick={() => setIsOpen(false)}
              onWheel={() => setIsOpen(false)}
            />
            <ul
              ref={menuRef}
              className="menu bg-base-100 shadow-lg rounded-box border border-base-300 z-9999 max-h-48 overflow-y-auto"
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
