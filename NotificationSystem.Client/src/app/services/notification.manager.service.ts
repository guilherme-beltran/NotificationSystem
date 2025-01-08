import { Injectable, inject } from '@angular/core';
import { SignalRService } from './signalr.service';
import { Notification } from '../models/notification'

@Injectable({
  providedIn: 'root',
})
export class NotificationManagerService {
  private readonly signalRService = inject(SignalRService);

  constructor() {}

  async resendNotification(notification: Notification) {
    try {
        
      return await this.signalRService.resendNotification(notification);
    } catch (error) {
        
        this.signalRService.addFailedNotification(notification);
        return false;
    }
  }
}
