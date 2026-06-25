import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

const ghPagesRedirectKey = 'masayef-gh-pages-path';

if (typeof window !== 'undefined') {
  const storedPath = window.sessionStorage.getItem(ghPagesRedirectKey);

  if (storedPath) {
    window.sessionStorage.removeItem(ghPagesRedirectKey);

    const targetPath = storedPath.startsWith('/') ? storedPath : `/${storedPath}`;
    const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;

    if (targetPath !== currentPath) {
      window.history.replaceState({}, '', targetPath);
    }
  }
}

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
