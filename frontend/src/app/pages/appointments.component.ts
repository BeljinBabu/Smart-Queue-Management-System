import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { Appointment, SlotsResponse } from '../core/models';
import { addDays, errMsg, prettyDate, prettyTime, todayStr } from '../core/util';

@Component({
  selector: 'app-appointments',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="page-head">
      <div>
        <h1>My appointments</h1>
        <p class="muted">View, reschedule or cancel your bookings.</p>
      </div>
      <a class="btn" routerLink="/book">➕ New appointment</a>
    </div>

    @if (error) { <div class="alert err">{{ error }}</div> }
    @if (message) { <div class="alert okk">{{ message }}</div> }

    <div class="tabs">
      <button class="tab" [class.on]="tab === 'upcoming'" (click)="tab = 'upcoming'">Upcoming ({{ filtered('upcoming').length }})</button>
      <button class="tab" [class.on]="tab === 'past'" (click)="tab = 'past'">Past ({{ filtered('past').length }})</button>
      <button class="tab" [class.on]="tab === 'all'" (click)="tab = 'all'">All ({{ all.length }})</button>
    </div>

    <div class="card">
      @if (loading) {
        <div class="empty">Loading…</div>
      } @else if (filtered(tab).length === 0) {
        <div class="empty">No appointments here yet.</div>
      } @else {
        @for (a of filtered(tab); track a._id) {
          <div class="appt">
            <div class="tk">{{ a.tokenCode }}</div>
            <div class="info">
              <strong>{{ a.service.name }}</strong>
              <div class="muted small">{{ pd(a.date) }} · {{ pt(a.slot) }}</div>
              @if (a.notes) { <div class="small muted">“{{ a.notes }}”</div> }
            </div>
            <span class="badge s-{{ a.status }}">{{ a.status }}</span>
            <div class="row">
              <a class="btn ghost sm" [routerLink]="['/token', a._id]">Token</a>
              @if (a.status === 'BOOKED') {
                <button class="btn ghost sm" (click)="startReschedule(a)">Reschedule</button>
                <button class="btn bad sm" (click)="cancel(a)">Cancel</button>
              }
            </div>
          </div>

          @if (editing?._id === a._id) {
            <div class="card" style="background:var(--bg);margin-bottom:.8rem">
              <h3>Reschedule {{ a.tokenCode }}</h3>
              <label for="rdate">New date</label>
              <input id="rdate" type="date" [(ngModel)]="newDate" [min]="minDate" [max]="maxDate" (ngModelChange)="loadSlots()" />
              @if (slotsRes?.closed) {
                <div class="alert err">Service closed on that day.</div>
              } @else if (slotsRes) {
                <div class="slots">
                  @for (sl of slotsRes.slots; track sl.time) {
                    <button type="button" class="slot" [class.sel]="newSlot === sl.time" [disabled]="!sl.available" (click)="newSlot = sl.time">{{ pt(sl.time) }}</button>
                  }
                </div>
              }
              <div class="row" style="margin-top:.8rem">
                <button class="btn sm" [disabled]="!newSlot" (click)="confirmReschedule()">Confirm</button>
                <button class="btn ghost sm" (click)="editing = null">Close</button>
              </div>
            </div>
          }
        }
      }
    </div>
  `
})
export class AppointmentsComponent implements OnInit {
  private api = inject(ApiService);
  all: Appointment[] = [];
  tab: 'upcoming' | 'past' | 'all' = 'upcoming';
  loading = true;
  error = '';
  message = '';

  editing: Appointment | null = null;
  newDate = '';
  newSlot = '';
  slotsRes: SlotsResponse | null = null;
  minDate = todayStr();
  maxDate = addDays(todayStr(), 30);
  pd = prettyDate;
  pt = prettyTime;

  ngOnInit() {
    this.load();
  }

  load() {
    this.api.myAppointments().subscribe({
      next: (l) => { this.all = l; this.loading = false; },
      error: (e) => { this.error = errMsg(e); this.loading = false; }
    });
  }

  filtered(tab: string): Appointment[] {
    const today = todayStr();
    const isUp = (a: Appointment) => ['BOOKED', 'CALLED'].includes(a.status) && a.date >= today;
    if (tab === 'upcoming') {
      return this.all.filter(isUp).sort((a, b) => (a.date + a.slot).localeCompare(b.date + b.slot));
    }
    if (tab === 'past') return this.all.filter((a) => !isUp(a));
    return this.all;
  }

  cancel(a: Appointment) {
    if (!confirm(`Cancel appointment ${a.tokenCode}?`)) return;
    this.error = ''; this.message = '';
    this.api.cancel(a._id).subscribe({
      next: () => { this.message = 'Appointment cancelled.'; this.load(); },
      error: (e) => (this.error = errMsg(e))
    });
  }

  startReschedule(a: Appointment) {
    this.editing = a;
    this.newDate = a.date >= this.minDate ? a.date : this.minDate;
    this.newSlot = '';
    this.slotsRes = null;
    this.loadSlots();
  }

  loadSlots() {
    if (!this.editing || !this.newDate) return;
    this.newSlot = '';
    this.api.slots(this.editing.service._id, this.newDate).subscribe({
      next: (r) => (this.slotsRes = r),
      error: (e) => (this.error = errMsg(e))
    });
  }

  confirmReschedule() {
    if (!this.editing || !this.newSlot) return;
    this.error = ''; this.message = '';
    this.api.reschedule(this.editing._id, this.newDate, this.newSlot).subscribe({
      next: (a) => {
        this.message = `Rescheduled. Your token is ${a.tokenCode}.`;
        this.editing = null;
        this.load();
      },
      error: (e) => { this.error = errMsg(e); this.loadSlots(); }
    });
  }
}
