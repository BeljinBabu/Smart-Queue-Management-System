import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { Service } from '../core/models';
import { errMsg, prettyTime } from '../core/util';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

@Component({
  selector: 'app-admin-services',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page-head">
      <div>
        <h1>Services &amp; slots</h1>
        <p class="muted">Define services, working hours and slot duration. Tokens use the service code as prefix.</p>
      </div>
    </div>

    @if (error) { <div class="alert err">{{ error }}</div> }
    @if (message) { <div class="alert okk">{{ message }}</div> }

    <div class="grid g2">
      <div class="card">
        <h2>{{ editingId ? 'Edit service' : 'Add new service' }}</h2>
        <form (ngSubmit)="save()">
          <label for="name">Service name</label>
          <input id="name" name="name" [(ngModel)]="form.name" required />
          <div class="row" style="align-items:flex-start">
            <div style="flex:1;min-width:120px"><label for="code">Token code (max 5)</label><input id="code" name="code" [(ngModel)]="form.code" maxlength="5" required /></div>
            <div style="flex:2;min-width:160px"><label for="dept">Department</label><input id="dept" name="dept" [(ngModel)]="form.department" /></div>
          </div>
          <label for="desc">Description</label>
          <input id="desc" name="desc" [(ngModel)]="form.description" />
          <div class="row" style="align-items:flex-start">
            <div style="flex:1;min-width:110px"><label for="st">Start</label><input id="st" name="st" type="time" [(ngModel)]="form.startTime" required /></div>
            <div style="flex:1;min-width:110px"><label for="et">End</label><input id="et" name="et" type="time" [(ngModel)]="form.endTime" required /></div>
            <div style="flex:1;min-width:110px"><label for="sm">Slot (min)</label><input id="sm" name="sm" type="number" min="5" max="240" [(ngModel)]="form.slotMinutes" required /></div>
          </div>
          <label>Working days</label>
          <div class="chips">
            @for (d of dayNames; track $index) {
              <label class="chip" style="margin:0;font-weight:600">
                <input type="checkbox" [checked]="form.workingDays.includes($index)" (change)="toggleDay($index)" /> {{ d }}
              </label>
            }
          </div>
          <label class="chip" style="margin-top:.9rem;font-weight:600">
            <input type="checkbox" name="active" [(ngModel)]="form.isActive" /> Active (visible for booking)
          </label>
          <div class="row" style="margin-top:1rem">
            <button class="btn" type="submit">{{ editingId ? 'Update service' : 'Add service' }}</button>
            @if (editingId) { <button class="btn ghost" type="button" (click)="reset()">Cancel edit</button> }
          </div>
        </form>
      </div>

      <div class="card">
        <h2>All services ({{ services.length }})</h2>
        @if (services.length === 0) { <div class="empty">No services yet.</div> }
        @for (s of services; track s._id) {
          <div class="appt">
            <div class="tk">{{ s.code }}</div>
            <div class="info">
              <strong>{{ s.name }}</strong>
              <div class="muted small">{{ s.department }} · {{ pt(s.startTime) }}–{{ pt(s.endTime) }} · {{ s.slotMinutes }} min</div>
              <div class="muted small">{{ days(s) }}</div>
            </div>
            <span class="badge" [class.s-COMPLETED]="s.isActive" [class.s-CANCELLED]="!s.isActive">{{ s.isActive ? 'ACTIVE' : 'INACTIVE' }}</span>
            <div class="row">
              <button class="btn ghost sm" (click)="edit(s)">Edit</button>
              <button class="btn bad sm" (click)="remove(s)">Delete</button>
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class AdminServicesComponent implements OnInit {
  private api = inject(ApiService);
  services: Service[] = [];
  editingId = '';
  error = '';
  message = '';
  dayNames = DAY_NAMES;
  pt = prettyTime;
  form = this.blank();

  ngOnInit() {
    this.load();
  }

  private blank() {
    return {
      name: '', code: '', department: 'General', description: '',
      startTime: '09:00', endTime: '17:00', slotMinutes: 15,
      workingDays: [1, 2, 3, 4, 5, 6] as number[], isActive: true
    };
  }

  load() {
    this.api.services().subscribe({
      next: (s) => (this.services = s),
      error: (e) => (this.error = errMsg(e))
    });
  }

  days(s: Service): string {
    return s.workingDays.map((d) => DAY_NAMES[d]).join(', ') || 'No working days';
  }

  toggleDay(d: number) {
    const set = new Set(this.form.workingDays);
    if (set.has(d)) set.delete(d); else set.add(d);
    this.form.workingDays = [...set].sort();
  }

  edit(s: Service) {
    this.editingId = s._id;
    this.form = {
      name: s.name, code: s.code, department: s.department, description: s.description,
      startTime: s.startTime, endTime: s.endTime, slotMinutes: s.slotMinutes,
      workingDays: [...s.workingDays], isActive: s.isActive
    };
    this.error = ''; this.message = '';
  }

  reset() {
    this.editingId = '';
    this.form = this.blank();
  }

  save() {
    this.error = ''; this.message = '';
    const body = { ...this.form, slotMinutes: Number(this.form.slotMinutes) };
    const req = this.editingId ? this.api.updateService(this.editingId, body) : this.api.createService(body);
    req.subscribe({
      next: () => { this.message = this.editingId ? 'Service updated.' : 'Service added.'; this.reset(); this.load(); },
      error: (e) => (this.error = errMsg(e))
    });
  }

  remove(s: Service) {
    if (!confirm(`Delete service "${s.name}"?`)) return;
    this.error = ''; this.message = '';
    this.api.deleteService(s._id).subscribe({
      next: () => { this.message = 'Service deleted.'; this.load(); },
      error: (e) => (this.error = errMsg(e))
    });
  }
}
