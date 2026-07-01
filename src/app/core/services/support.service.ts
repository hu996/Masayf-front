import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiService } from './api.service';
import {
  normalizeSupportListResult,
  normalizeSupportTicketDetails,
  normalizeSupportTicketStats,
  SupportTicketAssignRequest,
  SupportTicketDetails,
  SupportTicketFilters,
  SupportTicketListResult,
  SupportTicketStats,
  SupportTicketReplyRequest,
  SupportTicketStatusRequest,
  SupportTicketSubmitRequest,
  SupportTicketSubmitResponse
} from '../models/support-ticket.model';

const ATTACHMENT_FIELD_NAME = 'attachments';

@Injectable({ providedIn: 'root' })
export class SupportService {
  constructor(private readonly api: ApiService) {}

  submitTicket(payload: SupportTicketSubmitRequest, attachments: File[] = []): Observable<SupportTicketSubmitResponse> {
    return this.api.post<unknown>('/Support/Tickets', this.buildFormData(payload, attachments)).pipe(
      map((value) => normalizeSupportTicketDetails(value))
    );
  }

  getTickets(filters: SupportTicketFilters = {}): Observable<SupportTicketListResult> {
    return this.api.get<unknown>('/Admin/SupportTickets', {
      ...filters,
      pageNumber: filters.pageNumber ?? 1,
      pageSize: filters.pageSize ?? 12
    }).pipe(map((value) => normalizeSupportListResult(value)));
  }

  getTicket(id: string): Observable<SupportTicketDetails> {
    return this.api.get<unknown>(`/Admin/SupportTickets/${encodeURIComponent(id)}`).pipe(map((value) => normalizeSupportTicketDetails(value)));
  }

  getStats(): Observable<SupportTicketStats> {
    return this.api.get<unknown>('/Admin/SupportTickets/Stats').pipe(
      map((value) => normalizeSupportTicketStats(value))
    );
  }

  replyTicket(id: string, payload: SupportTicketReplyRequest, attachments: File[] = []): Observable<SupportTicketDetails> {
    return this.api.post<unknown>(`/Admin/SupportTickets/${encodeURIComponent(id)}/Replies`, this.buildFormData(payload, attachments)).pipe(map((value) => normalizeSupportTicketDetails(value)));
  }

  updateStatus(id: string, payload: SupportTicketStatusRequest): Observable<SupportTicketDetails> {
    return this.api.put<unknown>(`/Admin/SupportTickets/${encodeURIComponent(id)}/Status`, payload).pipe(map((value) => normalizeSupportTicketDetails(value)));
  }

  assignTicket(id: string, payload: SupportTicketAssignRequest): Observable<SupportTicketDetails> {
    return this.api.put<unknown>(`/Admin/SupportTickets/${encodeURIComponent(id)}/Assign`, payload).pipe(map((value) => normalizeSupportTicketDetails(value)));
  }

  deleteTicket(id: string): Observable<boolean> {
    return this.api.delete<boolean>(`/Admin/SupportTickets/${encodeURIComponent(id)}`);
  }

  private buildFormData(payload: object, attachments: File[]): FormData {
    const formData = new FormData();

    Object.entries(payload as Record<string, unknown>).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        return;
      }

      if (typeof value === 'boolean') {
        formData.append(key, String(value));
        return;
      }

      formData.append(key, String(value));
    });

    attachments.forEach((file, index) => {
      // لو الـ backend عندك متوقع `Attachments[]` بدّل الاسم من هنا فقط.
      formData.append(ATTACHMENT_FIELD_NAME, file, file.name || `attachment-${index + 1}`);
    });

    return formData;
  }
}
