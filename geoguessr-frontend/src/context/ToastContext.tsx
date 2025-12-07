import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Toast } from '../components/ui/Toast';
import { toastManager } from '../services/toastManager';

interface ToastContextType {
  showToast: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<{ id: number; message: string; duration?: number }[]>([]);
  const [nextId, setNextId] = useState(0);

  const showToast = useCallback((message: string, duration?: number) => {
    const id = nextId;
    setNextId(prev => prev + 1);
    setToasts(prev => [...prev, { id, message, duration }]);
  }, [nextId]);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Register with toast manager on mount
  useEffect(() => {
    toastManager.setToastCallback(showToast);
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999 }}>
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            duration={toast.duration}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};
