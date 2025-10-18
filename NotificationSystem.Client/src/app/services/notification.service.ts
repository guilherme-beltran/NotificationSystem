import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, interval } from 'rxjs';
import { Notification } from '../models/notification';
import { SignalRService } from './signalr.service';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private readonly signalRService = inject(SignalRService);
  private notifications$ = new BehaviorSubject<Notification[]>([]);
  private retryInterval = 10000; 
  private maxRetryAttempts = 3;

  get notifications() {
    return this.notifications$.asObservable();
  }

  constructor() {
    // Retry periódico
    interval(this.retryInterval).subscribe(() => this.retryFailedNotifications());
  }

  addNotification(notification: Notification) {
    const current = this.notifications$.value.filter(n => n.id !== notification.id);
    this.notifications$.next([notification, ...current]);
  }

  removeNotification(notification: Notification) {
    this.notifications$.next(this.notifications$.value.filter(n => n.id !== notification.id));
  }

  private async retryFailedNotifications() {
    const notifications = [...this.notifications$.value];
    for (let i = 0; i < notifications.length; i++) {
      const notification = notifications[i];

      if ((notification as any).retryCount >= this.maxRetryAttempts) continue;
      (notification as any).retryCount = ((notification as any).retryCount || 0) + 1;

      const success = await this.signalRService.sendMessage(notification);
      if (success) {
        this.removeNotification(notification);
      } else {
        console.warn(`Falha ao reenviar notificação ${notification.id}, tentativas: ${(notification as any).retryCount}`);
      }
    }
  }

  async sendNotification(notification: Notification) {
    const success = await this.signalRService.sendMessage(notification);
    if (!success) this.addNotification(notification);
  }
}

