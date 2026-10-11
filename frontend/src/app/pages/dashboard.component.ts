import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { Appointment } from '../core/models';
import { prettyDate, prettyTime, todayStr } from '../core/util';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="page-head">
      <div>
        <h1>Hello, {{ auth.user()?.name }} 👋</h1>
        <p class="muted">Here is a quick look at your appointments.</p>
      </div>
      <a class="btn" routerLink="/book">➕ Book appointment</a>
    </div>

    <div class="grid g4">
      <div class="card stat"><div class="label">Upcoming</div><div class="value brand">{{ upcoming.length }}</div></div>
      <div class="card stat"><div class="label">Completed</div><div class="value ok">{{ count('COMPLETED') }}</div></div>
      <div class="card stat"><div class="label">Cancelled</div><div class="value bad">{{ count('CANCELLED') }}</div></div>
      <div class="card stat"><div class="label">Total booked</div><div class="value">{{ all.length }}</div></div>
    </div>

    <h2 style="margin-top:1.6rem">Your next appointment</h2>
    @if (loading) {
      <div class="card empty">Loading…</div>
    } @else if (next) {
      <div class="card">
        <div class="row between">
          <div>
            <div class="muted small">Digital token</div>
            <div style="font-size:2rem;font-weight:800;color:var(--brand)">{{ next.tokenCode }}</div>
          </div>
          <span class="badge s-{{ next.status }}">{{ next.status }}</span>
        </div>
        <p style="margin-top:.6rem"><strong>{{ next.service.name }}</strong> · {{ next.service.department }}</p>
        <p class="muted">{{ pd(next.date) }} at {{ pt(next.slot) }}</p>
        <div style="margin-top:.8rem"><a class="btn" [routerLink]="['/token', next._id]">Track live queue</a></div>
      </div>
    } @else {
      <div class="card empty">
        <p>You have no upcoming appointments.</p>
        <a class="btn" style="margin-top:.8rem" routerLink="/book">Book your first appointment</a>
      </div>
    }
  `
})
export class DashboardComponent implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthService);
  all: Appointment[] = [];
  upcoming: Appointment[] = [];
  next: Appointment | null = null;
  loading = true;
  pd = prettyDate;
  pt = prettyTime;

  ngOnInit() {
    this.api.myAppointments().subscribe({
      next: (list) => {
        this.all = list;
        const today = todayStr();
        this.upcoming = list
          .filter((a) => ['BOOKED', 'CALLED'].includes(a.status) && a.date >= today)
          .sort((a, b) => (a.date + a.slot).localeCompare(b.date + b.slot));
        this.next = this.upcoming[0] || null;
        this.loading = false;
      },
      error: () => (this.loading = false)
    });
  }

  count(status: string) {
    return this.all.filter((a) => a.status === status).length;
  }
}
