import { Component, OnInit, inject } from '@angular/core';
import { NotificationService } from './services/notification.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {
  private readonly notificationService = inject(NotificationService)
  constructor() {}

  ngOnInit() {

  }
}
