import { Injectable, isDevMode } from '@angular/core';
interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}
@Injectable({ providedIn: 'root' })
export class PwaService {
  readonly localPreview = window.location.protocol === 'http:' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(window.location.hostname));
  readonly offlineCapable = !this.localPreview && !isDevMode() && window.isSecureContext;
  readonly secureContext = window.isSecureContext;
  readonly localAddress = /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(window.location.hostname);
  promptEvent?: InstallPrompt;
  online = navigator.onLine;
  installed =
    window.matchMedia('(display-mode: standalone)').matches ||
    !!(navigator as Navigator & { standalone?: boolean }).standalone;
  constructor() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.promptEvent = e as InstallPrompt;
    });
    window.addEventListener('appinstalled', () => {
      this.installed = true;
      this.promptEvent = undefined;
    });
    window.addEventListener('online', () => (this.online = true));
    window.addEventListener('offline', () => (this.online = false));
    if (
      !this.localPreview && !isDevMode() &&
      'serviceWorker' in navigator &&
      window.isSecureContext
    ) {
      const register = () =>
        navigator.serviceWorker.register('/sw.js').catch(() => {
          /* App stays usable when installation is unavailable. */
        });
      if (document.readyState === 'complete') register();
      else window.addEventListener('load', register, { once: true });
    }
  }
  async install() {
    const event = this.promptEvent;
    if (!event) return;
    await event.prompt();
    await event.userChoice;
    this.promptEvent = undefined;
  }
}
