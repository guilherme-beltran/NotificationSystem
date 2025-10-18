import { Injectable, inject } from '@angular/core';
import { SignalRService } from './signalr.service';
import { Notification } from '../models/notification';

@Injectable({
  providedIn: 'root',
})
export class NotificationManagerService {
  private readonly signalRService = inject(SignalRService);
  private failedNotifications: Notification[] = [];

  constructor() {
    // Quando reconectar, tenta reenviar todas as pendentes
    this.signalRService.connectionStatus$.subscribe((connected) => {
      if (connected) {
        this.resendFailedNotifications();
      }
    });
  }

  /**
   * Envia uma notificação. 
   * Se falhar, adiciona à fila de reenvio automático.
   */
  async sendNotification(notification: Notification): Promise<boolean> {
    try {
      await this.signalRService.sendMessage(notification);
      return true;
    } catch (error) {
      console.warn('Falha ao enviar notificação. Será reenviada depois.', error);
      this.addFailedNotification(notification);
      return false;
    }
  }

  /**
   * Reenvia todas as notificações que falharam anteriormente.
   */
  private async resendFailedNotifications() {
    if (this.failedNotifications.length === 0) return;

    console.log('🔁 Tentando reenviar notificações pendentes...');

    const remaining: Notification[] = [];

    for (const notification of this.failedNotifications) {
      try {
        await this.signalRService.sendMessage(notification);
        console.log(`✅ Notificação reenviada: ${notification.id} - ${notification.timestamp}`);
      } catch {
        remaining.unshift(notification);
      }
    }

    this.failedNotifications = remaining;
  }

  /**
   * Adiciona uma notificação à lista de falhas locais.
   */
  addFailedNotification(notification: Notification) {
    // Evita duplicar mensagens na fila
    const exists = this.failedNotifications.some(n => n.id === notification.id);
    if (!exists) {
      this.failedNotifications.unshift(notification);
    }
  }
}
