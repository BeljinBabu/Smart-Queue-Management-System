import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="shell">
      <aside class="sidebar">
        <div class="brand"><span class="logo">🎫</span><span>Smart Appointment</span></div>
        <nav class="nav">
          @if (auth.isAdmin()) {
            <div class="group">Administration</div>
            <a routerLink="/admin/dashboard" routerLinkActive="active">📊 Dashboard</a>
            <a routerLink="/admin/queue" routerLinkActive="active">📣 Queue Control</a>
            <a routerLink="/admin/services" routerLinkActive="active">🛠️ Services</a>
          } @else {
            <div class="group">Menu</div>
            <a routerLink="/dashboard" routerLinkActive="active">🏠 Dashboard</a>
            <a routerLink="/book" routerLinkActive="active">➕ Book Appointment</a>
            <a routerLink="/appointments" routerLinkActive="active">📅 My Appointments</a>
          }
        </nav>
        <div class="me">
          <strong>{{ auth.user()?.name }}</strong>
          <span class="small">{{ auth.user()?.email }}</span>
          <div style="margin-top:.6rem"><button class="btn ghost sm" (click)="auth.logout()">Logout</button></div>
        </div>
      </aside>
      <main class="main"><router-outlet /></main>
    </div>
  `
})
export class LayoutComponent {
  auth = inject(AuthService);
}
