type EventHandler = (...args: any[]) => void;

class EventBus {
  private events: { [key: string]: EventHandler[] } = {};

  on(event: string, callback: EventHandler): void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  off(event: string, callback: EventHandler): void {
    if (!this.events[event]) {
      return;
    }
    this.events[event] = this.events[event].filter((cb) => cb !== callback);
  }

  emit(event: string, ...args: any[]): void {
    if (!this.events[event]) {
      return;
    }
    this.events[event].forEach((cb) => cb(...args));
  }
}

export const appEventBus = new EventBus();

export default appEventBus;
