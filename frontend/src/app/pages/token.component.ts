import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { QueueInfo } from '../core/models';
import { errMsg, prettyDate, prettyTime } from '../core/util';

@Component({
  selector: 'app-token',
  standalone: true,
  imports: [RouterLink],
  template: `
    @if (error) { <div class="alert err">{{ error }}</div> }
    @if (!info && !error) { <div class="card empty">Loading your token…</div> }

    @if (info) {
      <div class="ticket">
        <div class="top">
          <div class="small" style="opacity:.85">YOUR DIGITAL TOKEN</div>
          <div class="code">{{ info.appointment.tokenCode }}</div>
          <span class="badge s-{{ info.appointment.status }}" style="margin-top:.5rem">{{ info.appointment.status }}</span>
        </div>
        <div class="body">
          <div class="kv"><span class="muted">Service</span><strong>{{ info.appointment.service.name }}</strong></div>
          <div class="kv"><span class="muted">Department</span><span>{{ info.appointment.service.department }}</span></div>
          <div class="kv"><span class="muted">Date</span><span>{{ pd(info.appointment.date) }}</span></div>
          <div class="kv"><span class="muted">Time slot</span><span>{{ pt(info.appointment.slot) }}</span></div>
          @if (auth.isAdmin() && info.appointment.user) {
            <div class="kv"><span class="muted">Booked by</span><span>{{ info.appointment.user.name }}</span></div>
          }
        </div>
        <div class="tear"></div>
        <div class="body">
          <div class="row between">
            <strong><span class="pulse"></span>Live queue</strong>
            <span class="muted small">auto-refreshes every 5s</span>
          </div>

          @if (info.appointment.status === 'BOOKED') {
            <div class="live">
              <div class="box"><div class="muted small">Now serving</div><div class="n">{{ info.nowServing || '—' }}</div></div>
              <div class="box"><div class="muted small">People ahead</div><div class="n">{{ info.ahead }}</div></div>
              <div class="box"><div class="muted small">Est. wait</div><div class="n">{{ info.estimatedWaitMins }}<span class="small"> min</span></div></div>
            </div>
            @if (info.ahead === 0 && !info.nowServing) {
              <div class="alert okk">You are next in line. Please be at the counter.</div>
            }
          } @else if (info.appointment.status === 'CALLED') {
            <div class="alert okk" style="font-size:1.05rem"><strong>It's your turn!</strong> Please proceed to the counter now.</div>
          } @else if (info.appointment.status === 'COMPLETED') {
            <div class="alert okk">This appointment is completed. Thank you!</div>
          } @else if (info.appointment.status === 'SKIPPED') {
            <div class="alert err">Your token was skipped. Please contact the help desk.</div>
          } @else {
            <div class="alert err">This appointment was cancelled.</div>
          }
        </div>
      </div>
      <div style="text-align:center;margin-top:1rem">
        <a class="btn ghost" [routerLink]="auth.isAdmin() ? '/admin/queue' : '/appointments'">← Back</a>
      </div>
    }
  `
})
export class TokenComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  auth = inject(AuthService);
  info: QueueInfo | null = null;
  error = '';
  private timer: any;
  pd = prettyDate;
  pt = prettyTime;

  ngOnInit() {
    this.refresh();
    this.timer = setInterval(() => this.refresh(), 5000);
  }

  ngOnDestroy() {
    clearInterval(this.timer);
  }

  private refresh() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.api.queue(id).subscribe({
      next: (i) => { this.info = i; this.error = ''; },
      error: (e) => (this.error = errMsg(e))
    });
  }
}
