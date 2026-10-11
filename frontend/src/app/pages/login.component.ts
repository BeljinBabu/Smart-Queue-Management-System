import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { errMsg } from '../core/util';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-wrap">
      <div class="auth-card">
        <div class="brand"><span class="logo">🎫</span><span>Smart Appointment</span></div>
        <h2>Welcome back</h2>
        <p class="muted">Sign in to book appointments and track your token.</p>

        @if (error) { <div class="alert err">{{ error }}</div> }

        <form (ngSubmit)="submit()">
          <label for="email">Email</label>
          <input id="email" name="email" type="email" [(ngModel)]="email" required autocomplete="username" />
          <label for="password">Password</label>
          <input id="password" name="password" type="password" [(ngModel)]="password" required autocomplete="current-password" />
          <button class="btn" style="width:100%;margin-top:1.1rem" type="submit" [disabled]="loading">
            {{ loading ? 'Signing in…' : 'Sign in' }}
          </button>
        </form>

        <p class="small" style="margin-top:1rem">New here? <a routerLink="/register">Create an account</a></p>

        <div class="demo">
          <strong>Demo logins</strong> (after running the seed script)
          <div class="row" style="margin-top:.4rem">
            <button class="btn ghost sm" type="button" (click)="fill('user@smartappointment.com','User@123')">User</button>
            <button class="btn ghost sm" type="button" (click)="fill('admin@smartappointment.com','Admin@123')">Admin</button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  email = '';
  password = '';
  error = '';
  loading = false;

  fill(e: string, p: string) {
    this.email = e;
    this.password = p;
  }

  submit() {
    this.error = '';
    this.loading = true;
    this.auth.login(this.email, this.password).subscribe({
      next: () => this.router.navigateByUrl(this.auth.homeUrl()),
      error: (e) => { this.error = errMsg(e); this.loading = false; }
    });
  }
}
