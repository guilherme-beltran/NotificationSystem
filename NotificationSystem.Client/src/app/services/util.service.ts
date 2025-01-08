import { Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';

@Injectable({
  providedIn: 'root',
})
export class UtilService {
  private readonly url: string = "https://localhost:44376";
  public readonly typeColorMap: { [key: string]: string } = {
    info: 'primary',
    warning: 'warning',
    error: 'danger',
    success: 'success',
  };

  constructor(private toast: ToastrService) {}

  getUrl = () => this.url;

  showToast = (type: string, message: string) => {
    
    const _type = this.typeColorMap[type];
    
    if (!_type) {
      this.toast.info(message);
      return;
    } 

    switch (type.toLowerCase()) {
      case 'info':
        this.toast.info(message);
        break;
      case 'warning':
        this.toast.warning(message);
        break;
      case 'error':
        this.toast.error(message);
        break;
      case 'success':
        this.toast.success(message);
        break;
      default:
        this.toast.info(message); 
        break;
    }

  }

}