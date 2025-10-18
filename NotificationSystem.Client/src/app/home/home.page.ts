import { Component, OnInit, inject } from '@angular/core';
import { SignalRService } from '../services/signalr.service';
import { UtilService } from '../services/util.service';
import { NotificationService } from '../services/notification.service';
import { Notification } from '../models/notification';

interface User {
  id: number;
  name: string;
}

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit {
  private readonly util = inject(UtilService);
  private readonly signalRService = inject(SignalRService);
  private readonly notificationService = inject(NotificationService);
  public message: string = '';
  public selectedType: string = 'info';
  public notificationTypes: string[] = ['info', 'warning', 'error', 'success'];
  public typeColorMap: any = this.util.typeColorMap;
  public user: User = { id: 0, name: '' };
  public users: User[] = this.signalRService.users;
  public recipientId: number | null = null;

  constructor() {}

  ngOnInit() {
    let id = localStorage.getItem('user_id');
    if (!id) {
      id = Math.floor(Math.random() * 50).toString();
      localStorage.setItem('user_id', id);
    }
    
    this.user = { id: Number(id), name: `User ${id}` };
    
    this.signalRService.startConnection(this.user);
    this.signalRService.onMessageReceived((type, message, fromUserId) => {
      const normalizedType = type.toLowerCase();
      this.util.showToast(normalizedType, message);
    });
  }

  selectType(type: string) {
    this.selectedType = type;
  }

  async sendMessage() {
    
    if (!this.message.trim() || !this.recipientId) {
      this.util.showToast('danger', 'Por favor, preencha todos os campos antes de enviar.');
      return;
    } 

    const notification: Notification = {
      id: crypto.randomUUID(),
      type: this.selectedType,
      message: this.message,
      fromUser: this.user.id,
      toUser: this.recipientId!,
      timestamp: new Date(),
    };
    await this.notificationService.sendNotification(notification);

    this.message = '';
  }

  getUsers = () => {
    this.signalRService.getUsers().then((users: User[]) => {
      this.users = users; 
    });
  }

}
