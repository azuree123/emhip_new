import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { PathwayCategoryTotalDto } from '../../core/api-models';
import { ReportsApiService } from '../../core/reports-api.service';

/**
 * Display metadata (label + chart color) for each PathwayCategory enum value.
 * The three brand colors (maroon/coral/gold) are lifted verbatim from the
 * "Pathway distribution" card in the source Figma export (Desktop50, around
 * lines 35141-35365 of Components.bundle.js); the remaining three extend the
 * same palette using the secondary-*-700 tones already defined in
 * project/design-system/fig-tokens.css, since the source mockup only drew
 * three sample rows but our real data has six pathway categories.
 */
const CATEGORY_META: Record<string, { label: string; color: string }> = {
  HousingAdvice: { label: 'Housing Advice', color: 'rgb(148, 28, 60)' },
  EmploymentSupport: { label: 'Employment Support', color: 'rgb(235, 60, 44)' },
  BenefitsFinancialSupport: { label: 'Benefits & Financial Support', color: 'rgb(201, 167, 35)' },
  FoodEssentials: { label: 'Food & Essentials', color: 'rgb(15, 118, 110)' },
  ImmigrationLegalAdvice: { label: 'Immigration & Legal Advice', color: 'rgb(29, 78, 216)' },
  OtherPracticalAdvice: { label: 'Other Practical Advice', color: 'rgb(109, 40, 217)' },
};

interface CategoryRow extends PathwayCategoryTotalDto {
  label: string;
  color: string;
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

@Component({
  selector: 'app-reports',
  standalone: true,
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss',
})
export class ReportsComponent implements OnInit {
  private readonly reportsApi = inject(ReportsApiService);

  readonly maxDate = toIsoDate(new Date());
  readonly todayLabel = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  readonly from = signal<string>(this.monthsAgoIso(6));
  readonly to = signal<string>(this.maxDate);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly totalReferrals = signal<number | null>(null);
  readonly categoryTotals = signal<PathwayCategoryTotalDto[]>([]);

  readonly categoryRows = computed<CategoryRow[]>(() =>
    [...this.categoryTotals()]
      .sort((a, b) => b.percentage - a.percentage)
      .map((ct) => ({
        ...ct,
        label: CATEGORY_META[ct.category]?.label ?? ct.category,
        color: CATEGORY_META[ct.category]?.color ?? 'rgb(114, 114, 114)',
      })),
  );

  readonly topCategory = computed<CategoryRow | null>(() => this.categoryRows()[0] ?? null);

  ngOnInit(): void {
    this.load();
  }

  onFromChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (!value) return;
    this.from.set(value);
    this.load();
  }

  onToChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (!value) return;
    this.to.set(value);
    this.load();
  }

  applyPreset(months: number): void {
    this.to.set(this.maxDate);
    this.from.set(this.monthsAgoIso(months));
    this.load();
  }

  exportCsv(): void {
    window.location.href = this.reportsApi.exportUrl(this.from(), this.to());
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.reportsApi.getPathwayReport(this.from(), this.to()).subscribe({
      next: (report) => {
        this.totalReferrals.set(report.totalReferrals);
        this.categoryTotals.set(report.categoryTotals ?? []);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.message ?? 'Unable to load report data.');
        this.totalReferrals.set(null);
        this.categoryTotals.set([]);
        this.loading.set(false);
      },
    });
  }

  private monthsAgoIso(months: number): string {
    const d = new Date();
    d.setMonth(d.getMonth() - months);
    return toIsoDate(d);
  }
}
