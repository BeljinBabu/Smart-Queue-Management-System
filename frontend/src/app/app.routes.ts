import { Routes } from '@angular/router';
import { adminGuard, authGuard, guestGuard, userGuard } from './core/guards';
import { LayoutComponent } from './layout/layout.component';
import { LoginComponent } from './pages/login.component';
import { RegisterComponent } from './pages/register.component';
import { DashboardComponent } from './pages/dashboard.component';
import { BookComponent } from './pages/book.component';
import { AppointmentsComponent } from './pages/appointments.component';
import { TokenComponent } from './pages/token.component';
import { AdminDashboardComponent } from './pages/admin-dashboard.component';
import { AdminQueueComponent } from './pages/admin-queue.component';
import { AdminServicesComponent } from './pages/admin-services.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  { path: 'register', component: RegisterComponent, canActivate: [guestGuard] },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', component: DashboardComponent, canActivate: [userGuard] },
      { path: 'book', component: BookComponent, canActivate: [userGuard] },
      { path: 'appointments', component: AppointmentsComponent, canActivate: [userGuard] },
      { path: 'token/:id', component: TokenComponent },
      { path: 'admin/dashboard', component: AdminDashboardComponent, canActivate: [adminGuard] },
      { path: 'admin/queue', component: AdminQueueComponent, canActivate: [adminGuard] },
      { path: 'admin/services', component: AdminServicesComponent, canActivate: [adminGuard] }
    ]
  },
  { path: '**', redirectTo: '' }
];
