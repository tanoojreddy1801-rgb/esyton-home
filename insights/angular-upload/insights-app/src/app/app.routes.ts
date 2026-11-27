import { Routes } from '@angular/router';
import { ArticlePage } from './pages/article';
import { HomePage } from './pages/home';
import { LegalPage } from './pages/legal';
import { NotFoundPage } from './pages/not-found';

export const routes: Routes = [
  { path: '', component: HomePage },
  { path: 'a/:slug', component: ArticlePage },
  { path: 'terms', component: LegalPage, data: { kind: 'terms' } },
  { path: 'disclaimer', component: LegalPage, data: { kind: 'disclaimer' } },
  { path: 'dashboard', loadComponent: () => import('./pages/dashboard').then((m) => m.DashboardPage) },
  { path: 'write', loadComponent: () => import('./pages/editor').then((m) => m.EditorPage) },
  { path: 'write/:id', loadComponent: () => import('./pages/editor').then((m) => m.EditorPage) },
  { path: '**', component: NotFoundPage },
];
