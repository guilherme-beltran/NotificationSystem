import { Component, OnInit, inject } from '@angular/core';
import { SignalRService } from '../services/signalr.service';
import { UtilService } from '../services/util.service';

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
  public message: string = '';
  public selectedType: string = 'info';
  public notificationTypes: string[] = ['info', 'warning', 'error', 'success'];
  public typeColorMap: any = this.util.typeColorMap;
  public user: User = { id: 0, name: '' };
  public users: User[] = this.signalRService.users;
  public recipientId: number | null = null;

  constructor() {}

  ngOnInit() {

    const id = Math.floor(Math.random() * 50);
    this.user = {
      id: id,
      name: `User ${id}`
    }
    
    this.signalRService.startConnection(this.user);
    this.signalRService.onMessageReceived((type, message) => {
      const normalizedType = type.toLowerCase();
      this.util.showToast(normalizedType, message);
    });
  }

  selectType(type: string) {
    this.selectedType = type;
  }

  sendMessage() {
    if (!this.message.trim() || !this.recipientId) {
      this.util.showToast('danger', 'Por favor, preencha todos os campos antes de enviar.');
      return;
    } 

    this.signalRService.sendMessage(this.selectedType, this.message, this.recipientId!);
    this.message = '';
    //this.recipientId = null;
  }

  getUsers = () => {
    this.signalRService.getUsers().then((users: User[]) => {
      this.users = users; 
    });
  }

}
