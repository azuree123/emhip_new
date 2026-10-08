import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { CaseworkNoteInput, GuestActionDto } from '../../core/api-models';
import { AuthService } from '../../core/auth.service';
import { GuestsApiService } from '../../core/guests-api.service';
import { SettingsApiService } from '../../core/settings-api.service';
import { CaseworkSbarNoteDialogComponent } from './casework-sbar-note-dialog.component';

function isoDay(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const pad = (n: number) => `${n}`.padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function action(id: string, dueOffset: number): GuestActionDto {
  return {
    id,
    description: `Action ${id}`,
    dueDate: isoDay(dueOffset),
    assignedToStaffId: null,
    assignedToName: null,
    isCompleted: false,
    isOverdue: dueOffset < 0,
    createdAt: new Date().toISOString(),
    completedAt: null,
  };
}

describe('CaseworkSbarNoteDialogComponent', () => {
  let fixture: ComponentFixture<CaseworkSbarNoteDialogComponent>;
  let component: CaseworkSbarNoteDialogComponent;
  let saved: CaseworkNoteInput[];
  let submitFlags: boolean[];

  beforeEach(async () => {
    saved = [];
    submitFlags = [];
    const guestsApi = {
      getActions: () => of([action('later', 5), action('overdue', -2), action('today', 0)]),
      saveCaseworkNote: (_: string, input: CaseworkNoteInput, submit: boolean) => {
        saved.push(input);
        submitFlags.push(submit);
        return of({ id: 'note-1' });
      },
      updateCaseworkNote: (_: string, __: string, input: CaseworkNoteInput, submit: boolean) => {
        saved.push(input);
        submitFlags.push(submit);
        return of(undefined);
      },
      deleteCaseworkNote: () => of(undefined),
    };
    const settingsApi = {
      getLookups: () => of([{ id: 'l1', category: 'AfaAdviceType', code: 'housing', label: 'Housing advice', sortOrder: 1, isActive: true }]),
      urgentResponseHours: signal(72),
    };
    const auth = { current: signal({ displayName: 'Amara Asante', permissions: [] }) };

    await TestBed.configureTestingModule({
      imports: [CaseworkSbarNoteDialogComponent],
      providers: [
        { provide: GuestsApiService, useValue: guestsApi },
        { provide: SettingsApiService, useValue: settingsApi },
        { provide: AuthService, useValue: auth },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CaseworkSbarNoteDialogComponent);
    fixture.componentRef.setInput('guestId', 'guest-1');
    fixture.componentRef.setInput('guestName', 'Aisha Mensah-Clarke');
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => fixture.destroy());

  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  it('opens as a new note with only Situation expanded', () => {
    expect(text()).toContain('New Casework Note');
    expect(text()).toContain('Aisha Mensah-Clarke');
    expect(component.isOpen('situation')).toBe(true);
    expect(component.isOpen('risk')).toBe(false);
  });

  /** Clicks the button whose text contains `label`, as the worker would. */
  function click(label: string): void {
    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    const button = buttons.find((b) => b.textContent?.includes(label));
    if (!button) throw new Error(`No button "${label}"`);
    button.click();
    fixture.detectChanges();
  }

  it('keeps the risk assessment to a single choice and shows the matching follow-on', () => {
    click('Risk assessment');
    click('Safeguarding concern');
    click('Risk of harm to others');

    expect(component.form.riskCheck).toBe('RiskOfHarmToOthers');
    const checked = (fixture.nativeElement as HTMLElement).querySelectorAll('[role="radio"][aria-checked="true"]');
    expect(checked.length).toBe(1);
    expect(text()).toContain('Hub Manager will be alerted immediately on submission');
    expect(text()).toContain('Crisis action notes');
    expect(text()).toContain('72-hour urgent follow-up window');

    click('None of the above apply');
    expect(text()).toContain('No Hub Manager alert will be sent.');
    expect(text()).not.toContain('Crisis action notes');
  });

  it('lists open actions soonest first with the design’s due labels', () => {
    const open = component.openActions()!;
    expect(open.map((a) => a.id)).toEqual(['overdue', 'today', 'later']);
    expect(component.dueLabel(open[0]).tone).toBe('overdue');
    expect(component.dueLabel(open[0]).text).toMatch(/^Overdue — was due /);
    expect(component.dueLabel(open[1]).text).toMatch(/^Due today — /);
    expect(component.dueLabel(open[2]).tone).toBe('later');
  });

  it('refuses to submit without the mandatory sections and opens the first gap', () => {
    component.form.contactMethod = 'InPerson';
    component.submit();

    expect(component.saveError()).toBe('Describe the current presenting concerns.');
    expect(saved.length).toBe(0);

    component.form.situation = 'Low mood since the anniversary.';
    component.form.assessment = 'Grief remains the main driver.';
    component.form.riskCheck = 'SuicidalIdeationOrSelfHarm';
    component.submit();
    expect(component.saveError()).toBe('Crisis action notes are required before submission.');
    expect(component.isOpen('risk')).toBe(true);
  });

  it('submits a complete note with the risk check, ticked actions and AFA section', () => {
    let submitted: boolean | null = null;
    component.saved.subscribe((s) => (submitted = s));

    const f = component.form;
    f.contactMethod = 'InPerson';
    f.situation = 'Low mood since the anniversary.';
    f.assessment = 'Grief remains the main driver.';
    component.setRiskCheck('NoteConcern');
    f.riskNotes = 'Will monitor sleep and appetite.';
    component.toggleTicked('overdue');
    component.startActionDraft();
    component.actionDraft = { description: 'Book GP review', dueDate: isoDay(7) };
    component.addActionDraft();
    f.nextContactDate = isoDay(14);
    f.adviceType = 'Housing advice';
    f.afaContactMethod = 'PhoneCall';
    f.afaNotes = 'Signposted to the council housing team.';

    component.submit();

    expect(component.saveError()).toBeNull();
    expect(submitFlags).toEqual([true]);
    const input = saved[0];
    expect(input.category).toBe('Casework');
    expect(input.isCpnContact).toBe(false);
    expect(input.riskCheck).toBe('NoteConcern');
    expect(input.riskNotes).toBe('Will monitor sleep and appetite.');
    expect(input.completedActionIds).toEqual(['overdue']);
    expect(input.actions).toEqual([{ description: 'Book GP review', dueDate: isoDay(7), assignedToStaffId: null }]);
    expect(input.adviceType).toBe('Housing advice');
    expect(input.afaContactMethod).toBe('PhoneCall');
    expect(input.additionalNotes).toBe('Signposted to the council housing team.');
    expect(submitted).toBe(true);
  });

  it('does not send risk notes when no risk applies', () => {
    const f = component.form;
    f.contactMethod = 'PhoneCall';
    f.riskNotes = 'left over from an earlier choice';
    component.setRiskCheck('NoneApply');
    component.saveDraft();

    expect(submitFlags).toEqual([false]);
    expect(saved[0].riskNotes).toBeNull();
  });

  it('saves a changed draft before closing', () => {
    let closed = false;
    component.closed.subscribe(() => (closed = true));

    component.form.contactMethod = 'PhoneCall';
    component.form.situation = 'Started writing.';
    component.close();

    expect(submitFlags).toEqual([false]);
    expect(closed).toBe(true);
  });

  it('asks before closing a note that cannot be saved yet', () => {
    let closed = false;
    component.closed.subscribe(() => (closed = true));

    component.form.situation = 'Started writing, no contact method yet.';
    component.close();

    expect(saved.length).toBe(0);
    expect(closed).toBe(false);
    expect(component.confirmingClose()).toBe(true);
  });
});
