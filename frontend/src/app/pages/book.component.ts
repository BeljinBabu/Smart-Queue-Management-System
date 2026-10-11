import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../core/api.service';
import { Service, SlotsResponse } from '../core/models';
import { addDays, errMsg, prettyTime, todayStr } from '../core/util';

@Component({
  selector: 'app-book',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page-head">
      <div>
        <h1>Book an appointment</h1>
        <p class="muted">Choose a service, pick a date and select a free time slot. Your digital token is generated instantly.</p>
      </div>
    </div>

    @if (error) { <div class="alert err">{{ error }}</div> }

    <div class="grid g2">
      <div class="card">
        <h2>1. Select service</h2>
        @if (services.length === 0) { <p class="muted">No services available right now.</p> }
        <div class="grid" style="gap:.6rem;margin-top:.6rem">
          @for (s of services; track s._id) {
            <button type="button" class="svc" [class.sel]="service?._id === s._id" (click)="pickService(s)">
              <div class="row between">
                <strong>{{ s.name }}</strong>
                <span class="chip">{{ s.code }}</span>
              </div>
              <div class="muted small">{{ s.department }} · {{ pt(s.startTime) }} – {{ pt(s.endTime) }} · {{ s.slotMinutes }} min slots</div>
              @if (s.description) { <div class="small" style="margin-top:.2rem">{{ s.description }}</div> }
            </button>
          }
        </div>
      </div>

      <div class="card">
        <h2>2. Date &amp; time slot</h2>
        <label for="date">Date</label>
        <input id="date" type="date" [(ngModel)]="date" [min]="minDate" [max]="maxDate" (ngModelChange)="loadSlots()" [disabled]="!service" />

        @if (!service) {
          <p class="muted" style="margin-top:.8rem">Select a service first.</p>
        } @else if (loadingSlots) {
          <p class="muted" style="margin-top:.8rem">Loading slots…</p>
        } @else if (slotsRes?.closed) {
          <div class="alert err">This service is closed on the selected day. Please choose another date.</div>
        } @else if (slotsRes) {
          <label>Available slots</label>
          <div class="slots">
            @for (sl of slotsRes.slots; track sl.time) {
              <button type="button" class="slot" [class.sel]="slot === sl.time" [disabled]="!sl.available" (click)="slot = sl.time">
                {{ pt(sl.time) }}
              </button>
            }
          </div>
          <p class="muted small" style="margin-top:.5rem">Greyed-out slots are already booked or have passed.</p>
        }

        <label for="notes">Notes (optional)</label>
        <textarea id="notes" rows="2" [(ngModel)]="notes" maxlength="300" placeholder="Reason for visit, special requests…"></textarea>

        <button class="btn" style="margin-top:1rem;width:100%" [disabled]="!slot || booking" (click)="book()">
          {{ booking ? 'Booking…' : 'Confirm & get token' }}
        </button>
      </div>
    </div>
  `
})
export class BookComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);

  services: Service[] = [];
  service: Service | null = null;
  minDate = todayStr();
  maxDate = addDays(todayStr(), 30);
  date = todayStr();
  slotsRes: SlotsResponse | null = null;
  slot = '';
  notes = '';
  loadingSlots = false;
  booking = false;
  error = '';
  pt = prettyTime;

  ngOnInit() {
    this.api.services().subscribe({
      next: (s) => (this.services = s),
      error: (e) => (this.error = errMsg(e))
    });
  }

  pickService(s: Service) {
    this.service = s;
    this.loadSlots();
  }

  loadSlots() {
    this.slot = '';
    this.error = '';
    if (!this.service || !this.date) return;
    this.loadingSlots = true;
    this.api.slots(this.service._id, this.date).subscribe({
      next: (r) => { this.slotsRes = r; this.loadingSlots = false; },
      error: (e) => { this.error = errMsg(e); this.loadingSlots = false; }
    });
  }

  book() {
    if (!this.service || !this.slot) return;
    this.error = '';
    this.booking = true;
    this.api.book({ serviceId: this.service._id, date: this.date, slot: this.slot, notes: this.notes }).subscribe({
      next: (a) => this.router.navigate(['/token', a._id]),
      error: (e) => { const msg = errMsg(e); this.booking = false; this.loadSlots(); this.error = msg; }
    });
  }
}
