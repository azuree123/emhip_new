import { GuestSegment } from '../../core/guest-segments';
import { DemographicFilterValue } from '../../shared/demographic-filters.component';

/**
 * Query params for /guests — the drill-through behind a report count, so clicking a KPI opens
 * exactly the guests it counts (the same mechanism as the dashboard's drill-throughs). The guest
 * list reads every key here and names the drill-through in its banner.
 */
export type GuestDrill = Record<string, string | boolean>;

/** Guests registered in the reporting period, narrowed by any other guest-list filters. */
export function registeredDrill(from: string, to: string, extra: GuestDrill = {}): GuestDrill {
  return { ...extra, registeredFrom: from, registeredTo: to };
}

/** A segment ending "InPeriod", measured over the reporting period (activity recorded in it). */
export function periodDrill(segment: GuestSegment, from: string, to: string, extra: GuestDrill = {}): GuestDrill {
  return { ...extra, segment, periodFrom: from, periodTo: to };
}

/** A demographic cohort as guest-list query params (the same keys the dashboard's demographics card uses). */
export function cohortDrill(cohort: DemographicFilterValue): GuestDrill {
  const params: GuestDrill = {};
  if (cohort.ethnicity) params['ethnicity'] = cohort.ethnicity;
  if (cohort.ageBand) params['ageBand'] = cohort.ageBand;
  if (cohort.gender) params['gender'] = cohort.gender;
  if (cohort.countryOfOrigin) params['countryOfOrigin'] = cohort.countryOfOrigin;
  return params;
}
