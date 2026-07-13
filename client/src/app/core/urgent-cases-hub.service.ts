import { Injectable, OnDestroy, inject, signal } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { UrgentCaseDto } from './api-models';

/**
 * Live Urgent Cases updates over SignalR (Emhip.Api's UrgentCasesHub). Browsers can't set
 * custom headers on the WebSocket handshake, so the hub id travels as `?hubId=` — see
 * UrgentCasesHub.cs.
 */
@Injectable({ providedIn: 'root' })
export class UrgentCasesHubService implements OnDestroy {
  private readonly auth = inject(AuthService);
  private connection: signalR.HubConnection | null = null;

  readonly latestEscalation = signal<UrgentCaseDto | null>(null);
  readonly connectionState = signal<signalR.HubConnectionState>(signalR.HubConnectionState.Disconnected);

  connect(): void {
    if (this.connection) return;

    const hubId = this.auth.current().hubId;
    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(`${environment.signalRHubUrl}?hubId=${hubId}`)
      .withAutomaticReconnect()
      .build();

    this.connection.on('urgentCaseEscalated', (urgentCase: UrgentCaseDto) => {
      this.latestEscalation.set(urgentCase);
    });

    this.connection.onreconnected(() => this.connectionState.set(signalR.HubConnectionState.Connected));
    this.connection.onreconnecting(() => this.connectionState.set(signalR.HubConnectionState.Reconnecting));
    this.connection.onclose(() => this.connectionState.set(signalR.HubConnectionState.Disconnected));

    this.connection
      .start()
      .then(() => this.connectionState.set(signalR.HubConnectionState.Connected))
      .catch((err) => console.error('UrgentCasesHub connection failed', err));
  }

  ngOnDestroy(): void {
    void this.connection?.stop();
  }
}
