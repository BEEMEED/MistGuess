type ToastCallback = (message: string, duration?: number) => void;

class ToastManager {
  private callback: ToastCallback | null = null;

  public setToastCallback(callback: ToastCallback) {
    this.callback = callback;
  }

  public show(message: string, duration?: number) {
    if (this.callback) {
      this.callback(message, duration);
    } else {
      // Fallback to console if toast not initialized
      console.warn('Toast:', message);
    }
  }
}

export const toastManager = new ToastManager();
