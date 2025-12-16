import { customAlphabet } from "nanoid";
import { createContext, useContext, useState, type PropsWithChildren } from "react";

const nanoid = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz", 10);

const TOAST_STATUS = [
  "primary",
  "secondary",
  "accent",
  "neutral",
  "info",
  "success",
  "warning",
  "error",
] as const;
type TOAST_STATUS = (typeof TOAST_STATUS)[number];

interface ToastItem {
  id: string;
  message: string;
  status: TOAST_STATUS;
}

interface AddToastParameter {
  message: string;
  status?: TOAST_STATUS;
  durationSeconds?: number;
}

const ToastContext = createContext<{
  toasts: ToastItem[];
  addToast: (params: AddToastParameter) => void;
}>({
  toasts: [],
  addToast: () => {},
});

export const ToastProvider = ({ children }: PropsWithChildren) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = (params: AddToastParameter) => {
    const id = nanoid();
    const toast: ToastItem = {
      id,
      message: params.message,
      status: params.status || "info",
    };
    setToasts((prevToasts) => [...prevToasts, toast]);
    if (params.durationSeconds && params.durationSeconds > 0) {
      setTimeout(() => {
        removeToast(id);
      }, params.durationSeconds * 1000);
    }
  };

  const removeToast = (id: string) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  };

  const value = {
    toasts,
    addToast,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast">
        {toasts.map((toast) => (
          <div key={toast.id} className={`alert alert-${toast.status} shadow-lg mb-2`}>
            <button
              className="btn btn-sm btn-circle btn-ghost"
              onClick={() => removeToast(toast.id)}
            >
              ✕
            </button>
            <div>
              {toast.message.split("\n").map((line, index) => (
                <span key={`toast-${toast.id}-${index}`}>
                  {line}
                  <br />
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
