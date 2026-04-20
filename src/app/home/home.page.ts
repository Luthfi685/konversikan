import { Component } from '@angular/core';
import { ThemeService } from '../services/theme.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage {
  categories = [
    { id: 'currency', name: 'Mata Uang', icon: 'cash-outline', color: 'linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)' },
    { id: 'length', name: 'Panjang', icon: 'resize-outline', color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
    { id: 'weight', name: 'Berat', icon: 'barbell-outline', color: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
    { id: 'shopping', name: 'Belanja', icon: 'cart-outline', color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
    { id: 'health', name: 'Kesehatan', icon: 'fitness-outline', color: 'linear-gradient(135deg, #ff5858 0%, #f09819 100%)' },
    { id: 'age', name: 'Umur & Zodiak', icon: 'calendar-outline', color: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)' }
  ];

  userName: string = '';

  constructor(public themeService: ThemeService) {}

  ionViewWillEnter() {
    const savedName = localStorage.getItem('userName');
    if (savedName) this.userName = savedName;
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }
}
