import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { Appointment, Service, Status } from '../core/models';
import { errMsg, prettyTime, todayStr } from '../core/util';

@Component({
  selector: 'app-admin-queue',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="page-head">
      <div>
        <h1>Queue control</h1>
        <p class="muted">Call the next token and manage today's appointments. The list refreshes automatically.</p>
      </div>
    </div>

    @if (error) { <div class="alert err">{{ error }}</div> }
    @if (message) { <div class="alert okk">{{ message }}</div> }

    <div class="card">
      <div class="row">
        <div style="min-width:220px">
          <label for="svc" style="margin-top:0">Service</label>
          <select id="svc" [(ngModel)]="serviceId" (ngModelChange)="load()">
            @for (s of services; track s._id) { <option [value]="s._id">{{ s.name }} ({{ s.code }})</option> }
          </select>
        </div>
        <div>
          <label for="qdate" style="margin-top:0">Date</label>
          <input id="qdate" type="date" [(ngModel)]="date" (ngModelChange)="load()" />
        </div>
      </div>
    </div>

    <div class="grid g4" style="margin-top:1rem">
      <div class="card stat">
        <div class="label">Now serving</div>
        <div class="value brand">{{ serving ? serving.tokenCode : '—' }}</div>
        @if (serving) { <div class="small muted">{{ serving.user?.name }}</div> }
      </div>
      <div class="card stat"><div class="label">Waiting</div><div class="value warn">{{ count('BOOKED') }}</div></div>
      <div class="card stat"><div class="label">Completed</div><div class="value ok">{{ count('COMPLETED') }}</div></div>
      <div class="card" style="display:grid;place-items:center">
        <button class="btn" style="font-size:1.05rem;padding:.8rem 1.4rem" [disabled]="busy || !serviceId" (click)="callNext()">
          📣 Call next token
        </button>
      </div>
    </div>

    <div class="card" style="margin-top:1rem">
      <h2>Appointments</h2>
      @if (list.length === 0) {
        <div class="empty">No appointments for this service on the selected date.</div>
      } @else {
        <div class="table-wrap">
          <table>
            <thead><tr><th>Token</th><th>Time</th><th>Patient / Visitor</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              @for (a of list; track a._id) {
                <tr>
                  <td><strong style="color:var(--brand)">{{ a.tokenCode }}</strong></td>
                  <td>{{ pt(a.slot) }}</td>
                  <td>{{ a.user?.name }}<div class="muted small">{{ a.user?.phone || a.user?.email }}</div></td>
                  <td><span class="badge s-{{ a.status }}">{{ a.status }}</span></td>
                  <td>
                    <div class="row">
                      @if (a.status === 'BOOKED' || a.status === 'SKIPPED') {
                        <button class="btn sm" (click)="setStatus(a, 'CALLED')">Call</button>
                      }
                      @if (a.status === 'CALLED') {
                        <button class="btn ok sm" (click)="setStatus(a, 'COMPLETED')">Complete</button>
                      }
                      @if (a.status === 'BOOKED' || a.status === 'CALLED') {
                        <button class="btn warn sm" (click)="setStatus(a, 'SKIPPED')">Skip</button>
                      }
                      @if (a.status === 'BOOKED' || a.status === 'SKIPPED') {
                        <button class="btn bad sm" (click)="setStatus(a, 'CANCELLED')">Cancel</button>
                      }
                      <a class="btn ghost sm" [routerLink]="['/token', a._id]">View</a>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `
})
export class AdminQueueComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  services: Service[] = [];
  serviceId = '';
  date = todayStr();
  list: Appointment[] = [];
  serving: Appointment | null = null;
  error = '';
  message = '';
  busy = false;
  pt = prettyTime;
  private timer: any;

  ngOnInit() {
    this.api.services().subscribe({
      next: (s) => {
        this.services = s;
        if (s.length) this.serviceId = s[0]._id;
        this.load();
      },
      error: (e) => (this.error = errMsg(e))
    });
    this.timer = setInterval(() => this.load(true), 5000);
  }

  ngOnDestroy() {
    clearInterval(this.timer);
  }

  load(silent = false) {
    if (!this.serviceId) return;
    this.api.adminAppointments(this.date, this.serviceId).subscribe({
      next: (l) => {
        this.list = l;
        this.serving = l.find((a) => a.status === 'CALLED') || null;
        if (!silent) this.error = '';
      },
      error: (e) => (this.error = errMsg(e))
    });
  }

  count(status: string) {
    return this.list.filter((a) => a.status === status).length;
  }

  callNext() {
    this.busy = true;
    this.error = ''; this.message = '';
    this.api.callNext(this.serviceId, this.date).subscribe({
      next: (r) => { this.message = r.message; this.busy = false; this.load(); },
      error: (e) => { this.error = errMsg(e); this.busy = false; }
    });
  }

  setStatus(a: Appointment, status: Status) {
    this.error = ''; this.message = '';
    this.api.setStatus(a._id, status).subscribe({
      next: () => { this.message = `${a.tokenCode} marked ${status.toLowerCase()}.`; this.load(); },
      error: (e) => (this.error = errMsg(e))
    });
  }
}
