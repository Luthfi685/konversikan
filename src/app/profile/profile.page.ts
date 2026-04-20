import { Component, OnInit } from '@angular/core';
import { ThemeService } from '../services/theme.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: false
})
export class ProfilePage implements OnInit {
  userName: string = '';
  userBio: string = 'Mahasiswa Produktif yang siap tempur di UTS! 💻🔥';

  constructor(public themeService: ThemeService) {}

  ngOnInit() {
    this.userName = localStorage.getItem('userName') || '';
    const bio = localStorage.getItem('userBio');
    if (bio) this.userBio = bio;
  }

  saveProfile() {
    localStorage.setItem('userName', this.userName);
    localStorage.setItem('userBio', this.userBio);
  }
}
