import { ApiId, normalizeId } from './api-id.model';
import { resolveMediaUrl } from '../utils/media-url.util';

export type SupportTicketType =
  | 'Complaint'
  | 'TechnicalIssue'
  | 'Suggestion'
  | 'Inquiry'
  | 'Other';

export type SupportTicketPriority = 'Low' | 'Normal' | 'High' | 'Urgent';

export type SupportTicketStatus = 'New' | 'InProgress' | 'Resolved' | 'Closed' | 'Rejected';

export interface SupportTicketAttachment {
  id: ApiId;
  fileName: string;
  filePath?: string | null;
  imageUrl?: string | null;
  contentType?: string | null;
  size?: number | null;
  createdAt?: string | null;
  resolvedUrl: string;
}

export interface SupportTicketReply {
  id: ApiId;
  message: string;
  createdAt: string;
  authorName?: string | null;
  authorRole?: string | null;
  attachments: SupportTicketAttachment[];
}

export interface SupportTicketSummary {
  id: ApiId;
  ticketNumber: string;
  type: SupportTicketType;
  typeLabel: string;
  subject: string;
  messageSnippet: string;
  category?: string | null;
  priority: SupportTicketPriority;
  priorityLabel: string;
  status: SupportTicketStatus;
  statusLabel: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  allowContactBack: boolean;
  isAnonymous: boolean;
  createdAt: string;
  updatedAt?: string | null;
  replyCount: number;
  attachmentsCount: number;
  assignedToId?: ApiId | null;
  assignedToName?: string | null;
  attachments: SupportTicketAttachment[];
}

export interface SupportTicketDetails extends SupportTicketSummary {
  message: string;
  replies: SupportTicketReply[];
  closedAt?: string | null;
  closedByName?: string | null;
  notes?: string | null;
}

export interface SupportTicketStats {
  total: number;
  newCount: number;
  inProgressCount: number;
  resolvedCount: number;
  closedCount: number;
  rejectedCount: number;
}

export interface SupportTicketListResult {
  items: SupportTicketSummary[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  stats: SupportTicketStats;
}

export interface SupportTicketSubmitRequest {
  type: SupportTicketType | string;
  subject: string;
  message: string;
  category?: string | null;
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  priority: SupportTicketPriority | string;
  allowContactBack: boolean;
  isAnonymous: boolean;
}

export interface SupportTicketSubmitResponse extends SupportTicketDetails {}

export interface SupportTicketReplyRequest {
  message: string;
  isInternal?: boolean;
}

export interface SupportTicketAssignRequest {
  assigneeUserId: ApiId;
}

export interface SupportTicketStatusRequest {
  status: SupportTicketStatus | string;
  note?: string | null;
}

export interface SupportTicketFilters {
  search?: string;
  type?: SupportTicketType | string | null;
  status?: SupportTicketStatus | string | null;
  priority?: SupportTicketPriority | string | null;
  fromDate?: string | null;
  toDate?: string | null;
  pageNumber?: number;
  pageSize?: number;
}

export const supportTicketTypeOptions: Array<{ value: SupportTicketType; label: string; hint: string }> = [
  { value: 'Complaint', label: 'شكوى', hint: 'مشكلة في الخدمة أو السلوك' },
  { value: 'TechnicalIssue', label: 'مشكلة تقنية', hint: 'عطل أو خطأ في النظام' },
  { value: 'Suggestion', label: 'اقتراح تحسين', hint: 'فكرة أو تطوير مقترح' },
  { value: 'Inquiry', label: 'استفسار', hint: 'سؤال أو طلب توضيح' },
  { value: 'Other', label: 'أخرى', hint: 'أي نوع آخر' }
];

export const supportTicketPriorityOptions: Array<{ value: SupportTicketPriority; label: string; tone: string }> = [
  { value: 'Low', label: 'منخفضة', tone: 'info' },
  { value: 'Normal', label: 'عادية', tone: 'neutral' },
  { value: 'High', label: 'عالية', tone: 'warning' },
  { value: 'Urgent', label: 'عاجلة', tone: 'danger' }
];

export const supportTicketStatusOptions: Array<{ value: SupportTicketStatus; label: string; tone: string }> = [
  { value: 'New', label: 'جديدة', tone: 'neutral' },
  { value: 'InProgress', label: 'قيد العمل', tone: 'warning' },
  { value: 'Resolved', label: 'تم الحل', tone: 'success' },
  { value: 'Closed', label: 'مغلقة', tone: 'neutral' },
  { value: 'Rejected', label: 'مرفوضة', tone: 'danger' }
];

export function supportTypeLabel(value?: string | null): string {
  const normalized = normalizeSupportType(value);
  return supportTicketTypeOptions.find((item) => item.value === normalized)?.label ?? 'أخرى';
}

export function supportPriorityLabel(value?: string | null): string {
  const normalized = normalizeSupportPriority(value);
  return supportTicketPriorityOptions.find((item) => item.value === normalized)?.label ?? 'عادية';
}

export function supportStatusLabel(value?: string | null): string {
  const normalized = normalizeSupportStatus(value);
  return supportTicketStatusOptions.find((item) => item.value === normalized)?.label ?? 'جديدة';
}

export function normalizeSupportType(value?: string | null): SupportTicketType {
  const text = String(value ?? '').trim().toLowerCase();
  if (!text) return 'Other';

  if (['complaint', 'issue', 'problem', 'شكوى'].includes(text)) return 'Complaint';
  if (['technicalissue', 'technical_issue', 'technical issue', 'tech', 'bug', 'مشكلة تقنية'].includes(text)) return 'TechnicalIssue';
  if (['suggestion', 'idea', 'اقتراح'].includes(text)) return 'Suggestion';
  if (['inquiry', 'question', 'استفسار', 'support'].includes(text)) return 'Inquiry';
  return 'Other';
}

export function normalizeSupportPriority(value?: string | null): SupportTicketPriority {
  const text = String(value ?? '').trim().toLowerCase();
  if (!text) return 'Normal';

  if (['low', 'min', 'minor', 'منخفضة'].includes(text)) return 'Low';
  if (['high', 'important', 'highpriority', 'عالية'].includes(text)) return 'High';
  if (['urgent', 'critical', 'asap', 'عاجلة'].includes(text)) return 'Urgent';
  return 'Normal';
}

export function normalizeSupportStatus(value?: string | null): SupportTicketStatus {
  const text = String(value ?? '').trim().toLowerCase();
  if (!text) return 'New';

  if (['new', 'open', 'pending', 'جديدة'].includes(text)) return 'New';
  if (['inprogress', 'in_progress', 'progress', 'working', 'قيد العمل', 'in progress'].includes(text)) return 'InProgress';
  if (['resolved', 'done', 'solved', 'تم الحل'].includes(text)) return 'Resolved';
  if (['closed', 'close', 'مغلقة'].includes(text)) return 'Closed';
  if (['rejected', 'رفض', 'مرفوضة'].includes(text)) return 'Rejected';
  return 'New';
}

export function normalizeSupportTicketAttachment(raw: unknown): SupportTicketAttachment {
  const value = asRecord(raw);
  const filePath = pickText(value, ['filePath', 'path', 'url', 'imageUrl', 'fileUrl', 'relativePath']);
  const imageUrl = pickText(value, ['imageUrl', 'url', 'filePath', 'fileUrl', 'path']);
  const resolvedUrl = resolveMediaUrl(filePath || imageUrl, '');

  return {
    id: normalizeId(value['id'] ?? value['attachmentId'] ?? value['fileId']) ?? '',
    fileName: pickText(value, ['fileName', 'name', 'originalName', 'title']) || 'attachment',
    filePath: filePath || null,
    imageUrl: imageUrl || null,
    contentType: pickText(value, ['contentType', 'mimeType']) || null,
    size: pickNumber(value, ['size', 'length', 'fileSize'], null),
    createdAt: pickText(value, ['createdAt', 'addedAt', 'date']) || null,
    resolvedUrl
  };
}

export function normalizeSupportTicketSummary(raw: unknown): SupportTicketSummary {
  const value = asRecord(raw);
  const attachments = extractArray(value, ['attachments', 'files', 'images', 'photos']).map((item) => normalizeSupportTicketAttachment(item));
  const id = normalizeId(value['id'] ?? value['ticketId'] ?? value['supportTicketId'] ?? value['guid']) ?? '';
  const ticketNumber = pickText(value, ['ticketNumber', 'number', 'ticketNo', 'referenceNumber']) || id;
  const type = normalizeSupportType(pickText(value, ['type', 'ticketType', 'categoryType']));
  const priority = normalizeSupportPriority(pickText(value, ['priority', 'priorityLevel', 'urgency']));
  const status = normalizeSupportStatus(pickText(value, ['status', 'ticketStatus', 'state']));

  return {
    id,
    ticketNumber,
    type,
    typeLabel: supportTypeLabel(type),
    subject: pickText(value, ['subject', 'title', 'summary']) || 'بدون عنوان',
    messageSnippet: pickText(value, ['messageSnippet', 'message', 'preview', 'description']).slice(0, 220),
    category: pickText(value, ['category', 'categoryName']) || null,
    priority,
    priorityLabel: supportPriorityLabel(priority),
    status,
    statusLabel: supportStatusLabel(status),
    fullName: pickText(value, ['fullName', 'name', 'userName', 'createdByName']) || 'زائر',
    email: pickText(value, ['email']) || null,
    phone: pickText(value, ['phone', 'mobile']) || null,
    allowContactBack: pickBoolean(value, ['allowContactBack', 'canContactBack', 'contactBack'], true),
    isAnonymous: pickBoolean(value, ['isAnonymous', 'anonymous'], false),
    createdAt: pickText(value, ['createdAt', 'submittedAt', 'dateCreated']) || new Date().toISOString(),
    updatedAt: pickText(value, ['updatedAt', 'lastUpdatedAt']) || null,
    replyCount: pickNumber(value, ['replyCount', 'repliesCount'], 0) ?? 0,
    attachmentsCount: pickNumber(value, ['attachmentsCount', 'filesCount'], attachments.length) ?? attachments.length,
    assignedToId: normalizeId(value['assignedToId'] ?? value['assigneeId'] ?? value['assignedUserId']),
    assignedToName: pickText(value, ['assignedToName', 'assigneeName', 'assignedUserName']) || null,
    attachments
  };
}

export function normalizeSupportTicketDetails(raw: unknown): SupportTicketDetails {
  const summary = normalizeSupportTicketSummary(raw);
  const value = asRecord(raw);
  const replies = extractArray(value, ['replies', 'comments', 'messages', 'responses']).map((item) => {
    const replyValue = asRecord(item);
    return {
      id: normalizeId(replyValue['id'] ?? replyValue['replyId'] ?? replyValue['commentId']) ?? '',
      message: pickText(replyValue, ['message', 'body', 'text']) || '',
      createdAt: pickText(replyValue, ['createdAt', 'dateCreated', 'time']) || new Date().toISOString(),
      authorName: pickText(replyValue, ['authorName', 'createdByName', 'userName']) || null,
      authorRole: pickText(replyValue, ['authorRole', 'roleName']) || null,
      attachments: extractArray(replyValue, ['attachments', 'files', 'images']).map((attachment) => normalizeSupportTicketAttachment(attachment))
    } satisfies SupportTicketReply;
  });

  return {
    ...summary,
    message: pickText(value, ['message', 'description', 'body']) || summary.messageSnippet,
    replies,
    closedAt: pickText(value, ['closedAt', 'resolvedAt']) || null,
    closedByName: pickText(value, ['closedByName', 'resolvedByName']) || null,
    notes: pickText(value, ['notes', 'adminNotes']) || null
  };
}

export function normalizeSupportTicketStats(raw: unknown): SupportTicketStats {
  const value = asRecord(raw);
  return {
    total: pickNumber(value, ['total', 'totalCount', 'count'], 0) ?? 0,
    newCount: pickNumber(value, ['newCount', 'new'], 0) ?? 0,
    inProgressCount: pickNumber(value, ['inProgressCount', 'progressCount'], 0) ?? 0,
    resolvedCount: pickNumber(value, ['resolvedCount', 'solvedCount'], 0) ?? 0,
    closedCount: pickNumber(value, ['closedCount', 'closeCount'], 0) ?? 0,
    rejectedCount: pickNumber(value, ['rejectedCount', 'rejectCount'], 0) ?? 0
  };
}

export function normalizeSupportListResult(raw: unknown): SupportTicketListResult {
  const value = asRecord(raw);
  const items = extractArray(value, ['items', 'tickets', 'results', 'data']).map((item) => normalizeSupportTicketSummary(item));
  const stats = value['stats'] ? normalizeSupportTicketStats(value['stats']) : normalizeSupportTicketStats(value);

  return {
    items,
    totalCount: pickNumber(value, ['totalCount', 'count', 'total'], items.length) ?? items.length,
    pageNumber: pickNumber(value, ['pageNumber', 'page', 'currentPage'], 1) ?? 1,
    pageSize: pickNumber(value, ['pageSize', 'size', 'perPage'], 10) ?? 10,
    stats
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function pickText(source: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
}

function pickNumber(source: Record<string, unknown>, keys: string[], fallback: number | null): number | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'number' && !Number.isNaN(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
  }
  return fallback;
}

function pickBoolean(source: Record<string, unknown>, keys: string[], fallback: boolean): boolean {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) return true;
      if (['false', '0', 'no', 'n', 'off'].includes(normalized)) return false;
    }
  }
  return fallback;
}

function extractArray(source: Record<string, unknown>, keys: string[]): unknown[] {
  for (const key of keys) {
    const value = source[key];
    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
}
