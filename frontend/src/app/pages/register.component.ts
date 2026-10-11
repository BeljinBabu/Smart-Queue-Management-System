import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { errMsg } from '../core/util';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-wrap">
      <div class="auth-card">
        <div class="brand"><span class="logo">🎫</span><span>Smart Appointment</span></div>
        <h2>Create your account</h2>
        <p class="muted">It takes less than a minute.</p>

        @if (error) { <div class="alert err">{{ error }}</div> }

        <form (ngSubmit)="submit()">
          <label for="name">Full name</label>
          <input id="name" name="name" [(ngModel)]="form.name" required />
          <label for="email">Email</label>
          <input id="email" name="email" type="email" [(ngModel)]="form.email" required />
          <label for="phone">Phone (optional)</label>
          <input id="phone" name="phone" [(ngModel)]="form.phone" />
          <label for="password">Password (min 6 characters)</label>
          <input id="password" name="password" type="password" [(ngModel)]="form.password" required minlength="6" />
          <button class="btn" style="width:100%;margin-top:1.1rem" type="submit" [disabled]="loading">
            {{ loading ? 'Creating…' : 'Register' }}
          </button>
        </form>
        <p class="small" style="margin-top:1rem">Already registered? <a routerLink="/login">Sign in</a></p>
      </div>
    </div>
  `
})
export class RegisterComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  form = { name: '', email: '', phone: '', password: '' };
  error = '';
  loading = false;

  submit() {
    this.error = '';
    if (this.form.password.length < 6) { this.error = 'Password must be at least 6 characters'; return; }
    this.loading = true;
    this.auth.register(this.form).subscribe({
      next: () => this.router.navigateByUrl(this.auth.homeUrl()),
      error: (e) => { this.error = errMsg(e); this.loading = false; }
    });
  }
}
