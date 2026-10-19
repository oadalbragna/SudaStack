/**
 * SudaStack Unified EventBus
 * Separates event producers (executing scripts, polling, network) from consumers (UI, logs, session manager).
 */

type EventCallback = (detail: any) => void;

class SudaEventBus extends EventTarget {
  public emit(eventName: string, detail?: any): void {
    const event = new CustomEvent(eventName, { detail });
    this.dispatchEvent(event);
  }

  public subscribe(eventName: string, callback: EventCallback): () => void {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent;
      callback(customEvent.detail);
    };
    this.addEventListener(eventName, handler);
    return () => {
      this.removeEventListener(eventName, handler);
    };
  }
}

export const eventBus = new SudaEventBus();
