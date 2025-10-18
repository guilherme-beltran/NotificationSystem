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
  private readonly util = inject(UtilService);
  private hubConnection!: signalR.HubConnection;
  private user: User | null = null;
  public users: User[] = [];
  public connectionStatus$ = new BehaviorSubject<boolean>(false);

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
        console.log('Conexão com SignalR iniciada')
        this.connectionStatus$.next(true);
      })
      .catch((err) => {
        this.connectionStatus$.next(false);
        this.util.showToast('error', `Erro ao conectar ao SignalR: ${JSON.stringify(err)}`);
        console.error('Erro ao conectar ao SignalR: ', err);
      });

    this.hubConnection.onreconnected(() => {
      console.log('🔁 Reconectado ao SignalR');
      this.connectionStatus$.next(true);
    });
    
    this.hubConnection.onreconnecting(() => {
      console.warn('⚠️ Reconectando ao SignalR...');
      this.connectionStatus$.next(false);
    });

    this.hubConnection.onclose(() => {
      console.warn('❌ Conexão encerrada');
      this.connectionStatus$.next(false);
    });
  }

  public async sendMessage(notification: Notification): Promise<boolean> {
    if (!this.user) return false;

    if (this.hubConnection.state !== signalR.HubConnectionState.Connected) {
      console.warn('Conexão SignalR não está pronta.');
      return false;
    }

    try {
      await this.hubConnection.invoke(
        'SendMessage',
        notification.type,
        notification.message,
        this.user.id,
        Number(notification.toUser)
      );
      console.log(`Mensagem enviada com sucesso  - ${notification.timestamp}`);
      return true;
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
      return false;
    }
  }

  public onMessageReceived(callback: (type: string, message: string, fromUserId: number) => void) {
    this.hubConnection.on('ReceiveMessage', callback);
  }

  public async getUsers(): Promise<User[]> {
    try {
      const users = await this.hubConnection.invoke('GetUsers');
      this.users = users.filter((u: User) => u.id !== this.user?.id);
      return this.users;
    } catch (err) {
      this.util.showToast('error', 'Erro ao obter usuários');
      console.error('Erro ao obter usuários:', err);
      return [];
    }
  }
}
