// Default/dev environment — used directly by `ng serve` and `ng build` (dev configuration).
// Swapped out for environment.prod.ts on production builds via angular.json's fileReplacements.
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:5299',
  signalRHubUrl: 'http://localhost:5299/hubs/urgent-cases',
};
