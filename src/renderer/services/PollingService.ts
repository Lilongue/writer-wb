// src/renderer/services/PollingService.ts

const FILE_POLLER_ID = 'file-poller';
const DIRECTORY_POLLER_ID = 'directory-poller';
const DEFAULT_POLL_INTERVAL = 3000; // ms

class PollingService {
  private timers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  private startPolling(
    id: string,
    callback: () => void,
    interval: number,
  ): void {
    // Сначала останавливаем существующий таймер с тем же ID, чтобы избежать дубликатов
    this.stopPolling(id);

    const timerId = setInterval(callback, interval);
    this.timers.set(id, timerId);
  }

  private stopPolling(id: string): void {
    if (this.timers.has(id)) {
      clearInterval(this.timers.get(id)!);
      this.timers.delete(id);
    }
  }

  public startFilePolling(
    callback: () => void,
    interval: number = DEFAULT_POLL_INTERVAL,
  ): void {
    this.startPolling(FILE_POLLER_ID, callback, interval);
  }

  public stopFilePolling(): void {
    this.stopPolling(FILE_POLLER_ID);
  }

  public startDirectoryPolling(
    callback: () => void,
    interval: number = DEFAULT_POLL_INTERVAL,
  ): void {
    this.startPolling(DIRECTORY_POLLER_ID, callback, interval);
  }

  public stopDirectoryPolling(): void {
    this.stopPolling(DIRECTORY_POLLER_ID);
  }

  public stopAllPolling(): void {
    // Копируем ключи перед итерацией, так как stopPolling изменяет Map
    const timerIds = Array.from(this.timers.keys());
    timerIds.forEach((id) => {
      this.stopPolling(id);
    });
  }
}

const pollingService = new PollingService();

export default pollingService;
