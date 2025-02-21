import { Injectable, inject } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { UtilService } from './util.service';
import { BehaviorSubject } from 'rxjs';
import { Notification } from '../models/notification'
import { v4 as uuidv4 } from 'uuid';

interface User {
  id: number;
  name: string;
}

@Injectable({
  providedIn: 'root',
})
export class SignalRService {
  private failedNotifications$ = new BehaviorSubject<Notification | null>(null);
  private readonly util = inject(UtilService);
  private hubConnection!: signalR.HubConnection;
  private user: User | null = null;
  public users: User[] = [];

  get failedNotifications() {
    return this.failedNotifications$.asObservable();
  }
  constructor() {}

  public startConnection(user: User) {
    this.user = user;
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${this.util.getUrl()}/notifications`, {
        accessTokenFactory: () => JSON.stringify(user),
      })
      .withAutomaticReconnect()
      .build();

    this.hubConnection
      .start()
      .then(() => {
        console.log('Conexão com SignalR iniciada');
      })
      .catch((err) => {
        this.util.showToast('error', `Erro ao conectar ao SignalR: ${JSON.stringify(err)}`);
        console.error('Erro ao conectar ao SignalR: ', err);
      });
  }

  public addFailedNotification = (notification: Notification) => {
    this.failedNotifications$.next(notification);
  }

  public async sendMessage(type: string, message: string, toUserId: number): Promise<boolean> {
    const id =  crypto.randomUUID()
    const notification: Notification = {
      id: id,
      type,
      message,
      fromUser: this.user?.id || 0,
      toUser: toUserId,
      timestamp: new Date(),
    };

    const _toUserId = typeof toUserId === 'string' ? parseInt(toUserId) : toUserId;
    if (this.user?.id === _toUserId) {
      this.util.showToast('info', 'Não é possível enviar mensagens a si mesmo.');
      return false;
    }

    try {
      await this.hubConnection.invoke('SendMessage', type, message, this.user?.id, _toUserId);
      console.log('Mensagem enviada com sucesso');
      return true;
    } catch (err) {
      this.util.showToast('error', 'Falha ao enviar mensagem');
      console.error('Erro ao enviar mensagem:', err);
      this.addFailedNotification(notification); 
      return false;
    }

  }

  public async resendNotification(notification: Notification): Promise<boolean> {
   
    const _toUserId = typeof notification.toUser === 'string' ? parseInt(notification.toUser) : notification.toUser;
    if (this.user?.id === _toUserId) {
      this.util.showToast('info', 'Não é possível enviar mensagens a si mesmo.');
      return false;
    }

    try {
      await this.hubConnection.invoke('SendMessage', notification.type, notification.message, this.user?.id, _toUserId);
      console.log('Mensagem enviada com sucesso');
      return true;
    } catch (err) {
      // this.util.showToast('error', 'Falha ao tentar reprocessar mensagem');
      console.error('Erro ao enviar mensagem:', err);
      this.addFailedNotification(notification); 
      return false;
    }

  }

  public getUsers = async (): Promise<User[]> => {
    try {
      const users = await this.hubConnection.invoke('GetUsers');
      const filteredUsers = users.filter((u: User) => u.id !== this.user?.id);
      this.users = filteredUsers;
      return filteredUsers;
    } catch (err) {
      this.util.showToast('error', 'Erro ao obter usuários');
      console.error('Erro ao obter usuários:', err);
      return [];
    }
  };
  
  public addMessageListener() {
    this.hubConnection.on(
      'ReceiveMessage',
      (type: string, message: string, fromUserId: number) => {
        const normalizedType = type.toLowerCase();
        this.util.showToast(normalizedType, 'Erro ao obter usuários');
        console.log(`Mensagem de ${fromUserId}: [${type}] ${message}`);
      }
    );
  }

  public onMessageReceived(callback: (type: string, message: string) => void) {
    this.hubConnection.on('ReceiveMessage', (type: string, message: string) => {
      callback(type, message);
    });
  }
}
