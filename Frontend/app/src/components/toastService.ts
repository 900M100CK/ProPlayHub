import { ToastOptions } from './ToastProvider';

type ToastHandler = (options: ToastOptions) => void;
type HideHandler = () => void;

let showHandler: ToastHandler | null = null;
let hideHandler: HideHandler | null = null;

export const registerToastHandlers = (show: ToastHandler, hide: HideHandler) => {
  showHandler = show;
  hideHandler = hide;
};

export const unregisterToastHandlers = () => {
  showHandler = null;
  hideHandler = null;
};

export const showGlobalToast = (options: ToastOptions) => {
  if (showHandler) {
    showHandler(options);
  } else {
    console.warn('Toast handler not registered yet.');
  }
};

export const hideGlobalToast = () => {
  if (hideHandler) {
    hideHandler();
  }
};

// Dummy default export to satisfy Expo Router route scanning when this file lives under app/
const ToastServiceRoute = () => null;
export default ToastServiceRoute;

