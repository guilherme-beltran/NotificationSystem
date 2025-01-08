export interface Notification {
    id: string;
    type: string;
    message: string;
    fromUser: number;
    toUser: number;
    timestamp: Date;
  }