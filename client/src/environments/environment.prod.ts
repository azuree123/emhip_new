// Production/Docker environment — swapped in for environment.ts on production builds (see
// angular.json's fileReplacements). Relative paths so the app works behind the nginx reverse
// proxy set up in client/Dockerfile + nginx.conf, which forwards /api/* and /hubs/* to the
// Emhip.Api container — no CORS, no hardcoded host/port.
export const environment = {
  production: true,
  apiBaseUrl: '/api',
  signalRHubUrl: '/hubs/urgent-cases',
};
