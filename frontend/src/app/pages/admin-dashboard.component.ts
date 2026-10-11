import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ApiService } from '../core/api.service';
import { Stats } from '../core/models';
import { errMsg } from '../core/util';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  template: `
    <div class="page-head">
      <div>
        <h1>Admin dashboard</h1>
        <p class="muted">Today's activity and overall appointment analytics.</p>
      </div>
    </div>

    @if (error) { <div class="alert err">{{ error }}</div> }

    @if (s) {
      <div class="grid g4">
        <div class="card stat"><div class="label">Today's appointments</div><div class="value brand">{{ s.today.total }}</div></div>
        <div class="card stat"><div class="label">Waiting now</div><div class="value warn">{{ s.today.waiting }}</div></div>
        <div class="card stat"><div class="label">Completed today</div><div class="value ok">{{ s.today.completed }}</div></div>
        <div class="card stat"><div class="label">Cancelled today</div><div class="value bad">{{ s.today.cancelled }}</div></div>
      </div>
      <div class="grid g4" style="margin-top:1rem">
        <div class="card stat"><div class="label">Total appointments</div><div class="value">{{ s.totalAppointments }}</div></div>
        <div class="card stat"><div class="label">Registered users</div><div class="value">{{ s.users }}</div></div>
        <div class="card stat"><div class="label">Active services</div><div class="value">{{ s.activeServices }}</div></div>
        <div class="card stat"><div class="label">Avg. service time</div><div class="value">{{ s.avgServiceMinutes }}<span class="small muted"> min</span></div></div>
      </div>

      <div class="grid g2" style="margin-top:1rem">
        <div class="card">
          <h2>Appointments – last 7 days</h2>
          <div class="chart">
            @for (d of s.last7Days; track d.date) {
              <div class="col">
                <div class="v">{{ d.count }}</div>
                <div class="b" [style.height.%]="barHeight(d.count)"></div>
                <div class="l">{{ dayLabel(d.date) }}</div>
              </div>
            }
          </div>
        </div>

        <div class="card">
          <h2>Status distribution</h2>
          @for (st of statuses; track st) {
            <div class="hbar">
              <div class="top"><span><span class="badge s-{{ st }}">{{ st }}</span></span><strong>{{ s.byStatus[st] || 0 }}</strong></div>
              <div class="bar-track"><div class="bar-fill" [style.width.%]="pct(s.byStatus[st] || 0, s.totalAppointments)"></div></div>
            </div>
          }
        </div>
      </div>

      <div class="card" style="margin-top:1rem">
        <h2>Service-wise appointments</h2>
        @if (s.byService.length === 0) { <p class="muted">No data yet.</p> }
        @for (sv of s.byService; track sv.code) {
          <div class="hbar">
            <div class="top"><span>{{ sv.name }} <span class="chip">{{ sv.code }}</span></span><strong>{{ sv.count }}</strong></div>
            <div class="bar-track"><div class="bar-fill" [style.width.%]="pct(sv.count, s.totalAppointments)"></div></div>
          </div>
        }
      </div>
    } @else if (!error) {
      <div class="card empty">Loading statistics…</div>
    }
  `
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  s: Stats | null = null;
  error = '';
  statuses = ['BOOKED', 'CALLED', 'COMPLETED', 'SKIPPED', 'CANCELLED'];
  private timer: any;

  ngOnInit() {
    this.load();
    this.timer = setInterval(() => this.load(), 15000);
  }

  ngOnDestroy() {
    clearInterval(this.timer);
  }

  private load() {
    this.api.stats().subscribe({
      next: (s) => { this.s = s; this.error = ''; },
      error: (e) => (this.error = errMsg(e))
    });
  }

  barHeight(count: number): number {
    const max = Math.max(1, ...(this.s?.last7Days.map((d) => d.count) || [1]));
    return Math.round((count / max) * 80);
  }

  pct(n: number, total: number): number {
    return total ? Math.round((n / total) * 100) : 0;
  }

  dayLabel(d: string): string {
    return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short' });
  }
}
