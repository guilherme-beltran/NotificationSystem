import { Injectable, inject } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { UtilService } from './util.service';

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

  public sendMessage(type: string, message: string, toUserId: number) {
    
    const _toUserId = typeof toUserId === 'string' ? parseInt(toUserId) : toUserId;
    if(this.user?.id === _toUserId){
      this.util.showToast('info', 'Não é possível enviar mensagens a si mesmo.');
      return;
    }

    this.hubConnection
      .invoke('SendMessage', type, message, this.user?.id, _toUserId)
      .catch((err) => {
        this.util.showToast('error', 'Erro ao enviar mensagem');
        console.error('Erro ao enviar mensagem:', err);
      });
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
