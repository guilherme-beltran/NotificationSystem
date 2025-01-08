import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, interval } from 'rxjs';
import { NotificationManagerService } from './notification.manager.service';
import { SignalRService } from './signalr.service';
import { Notification } from '../models/notification'

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private readonly notificationManagerService = inject(NotificationManagerService);
  private readonly signalRService = inject(SignalRService);
  private notifications$ = new BehaviorSubject<Notification[]>([]);
  
  /**
   * Intervalo de 10 segundos para tentar reenviar notificações
   * */
  private retryInterval = 10000; 
  
   /**
   * Máximo de tentativas de reenvio
   * */
  private maxRetryAttempts = 3;

  get notifications() {
    return this.notifications$.asObservable();
  }

  constructor() {
    this.signalRService.failedNotifications.subscribe((notification) => {
        if (notification) {
          this.addNotification(notification);
        }
      });
    // Tenta reenviar notificações falhadas periodicamente
    interval(this.retryInterval).subscribe(() => {
      console.log('Processando notificações com erros...');
      this.retryFailedNotifications();
    });
  }

  /**
   * Adiciona uma notificação à lista
   * */
  addNotification(notification: Notification) {
    if (!notification) {
      console.error(
        'Erro ao tentar adicionar notificação à lista de notificações internas do app.'
      );
      return;
    }

    // Filtra todas as notificações para remover aquelas com o mesmo ID
    const allNotifications = this.notifications$.value;
    const notificationsWithoutDuplicates = allNotifications.filter(n => n.id !== notification.id);
    
    this.notifications$.next(notificationsWithoutDuplicates);
    this.notifications$.next([notification, ...notificationsWithoutDuplicates]);
  }

  /**
   * Remove uma notificação da lista
   * */
  removeNotification(notification: Notification) {
    const updatedNotifications = this.notifications$.value.filter((n) => n !== notification);

    console.log('Removendo notificação...');
    this.notifications$.next(updatedNotifications);
  }

  /**
   * Reenvia notificações falhadas
   * */
  private async retryFailedNotifications() {
    const notifications = this.notifications$.value;

    console.log(`Qtd notificações com falha: ${notifications.length}`);
    let count = 0;
    notifications.forEach(async (notification) => {
      count++;
      if(count > this.maxRetryAttempts) return;

      console.log('Reenviando notificações...');
      try {
        const success = await this.resendNotification(notification);
        if (success) {
            console.log('notificação enviada com sucesso...');
            this.removeNotification(notification);
          }
      } catch (error) {
        console.log('Falha ao reenviar notificações...');
      }

    });
  }

  /**
   * Realiza o reenvio das notificações
   * */
  private async resendNotification(notification: Notification): Promise<boolean> {
    
      try {
        const success = await this.notificationManagerService.resendNotification(notification);
        return success;
      } catch (error) {
        console.warn(`Falha ao enviar notificação: ${JSON.stringify(notification)}`);
        return false;
      }
  }
  
}
