import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Appointment, QueueInfo, Service, SlotsResponse, Stats, Status, User } from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = '/api';

  // auth
  login(body: { email: string; password: string }): Observable<{ token: string; user: User }> {
    return this.http.post<{ token: string; user: User }>(`${this.base}/auth/login`, body);
  }
  register(body: any): Observable<{ token: string; user: User }> {
    return this.http.post<{ token: string; user: User }>(`${this.base}/auth/register`, body);
  }
  me(): Observable<{ user: User }> {
    return this.http.get<{ user: User }>(`${this.base}/auth/me`);
  }

  // services
  services(): Observable<Service[]> {
    return this.http.get<Service[]>(`${this.base}/services`);
  }
  createService(body: Partial<Service>): Observable<Service> {
    return this.http.post<Service>(`${this.base}/services`, body);
  }
  updateService(id: string, body: Partial<Service>): Observable<Service> {
    return this.http.put<Service>(`${this.base}/services/${id}`, body);
  }
  deleteService(id: string): Observable<any> {
    return this.http.delete(`${this.base}/services/${id}`);
  }

  // appointments (user)
  slots(serviceId: string, date: string): Observable<SlotsResponse> {
    const params = new HttpParams().set('serviceId', serviceId).set('date', date);
    return this.http.get<SlotsResponse>(`${this.base}/appointments/slots`, { params });
  }
  book(body: { serviceId: string; date: string; slot: string; notes?: string }): Observable<Appointment> {
    return this.http.post<Appointment>(`${this.base}/appointments`, body);
  }
  myAppointments(): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${this.base}/appointments/mine`);
  }
  queue(id: string): Observable<QueueInfo> {
    return this.http.get<QueueInfo>(`${this.base}/appointments/${id}/queue`);
  }
  cancel(id: string): Observable<Appointment> {
    return this.http.patch<Appointment>(`${this.base}/appointments/${id}/cancel`, {});
  }
  reschedule(id: string, date: string, slot: string): Observable<Appointment> {
    return this.http.patch<Appointment>(`${this.base}/appointments/${id}/reschedule`, { date, slot });
  }

  // admin
  adminAppointments(date: string, serviceId?: string): Observable<Appointment[]> {
    let params = new HttpParams().set('date', date);
    if (serviceId) params = params.set('serviceId', serviceId);
    return this.http.get<Appointment[]>(`${this.base}/admin/appointments`, { params });
  }
  callNext(serviceId: string, date: string): Observable<{ message: string; called: Appointment | null }> {
    return this.http.patch<{ message: string; called: Appointment | null }>(
      `${this.base}/admin/queue/call-next`, { serviceId, date });
  }
  setStatus(id: string, status: Status): Observable<Appointment> {
    return this.http.patch<Appointment>(`${this.base}/admin/appointments/${id}/status`, { status });
  }
  stats(): Observable<Stats> {
    return this.http.get<Stats>(`${this.base}/admin/stats`);
  }
}
