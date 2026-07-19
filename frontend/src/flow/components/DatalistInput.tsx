import { useId } from "react";

// 候補からの選択と自由入力を両立するコンボボックス (input + datalist)。
// PortaledSelect (選択のみ) と違い、候補に無い新しい値も入力できる。
// datalist のポップアップはブラウザネイティブ UI のため CSS transform の影響を受けない。

interface DatalistInputProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
}

export const DatalistInput = ({
  value,
  onChange,
  options,
  placeholder,
  className,
}: DatalistInputProps) => {
  const listId = useId();
  const hasOptions = options.length > 0;

  return (
    <>
      <input
        type="text"
        className={className ?? "input w-full"}
        list={hasOptions ? listId : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
      {hasOptions && (
        <datalist id={listId}>
          {options.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
      )}
    </>
  );
};
