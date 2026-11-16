import type { SupportTopic } from './validate.js';

export interface NewSupportRequest {
  shopperId: string;
  orderNumber: string;
  topic: SupportTopic;
  message: string;
}

export interface StoredSupportRequest extends NewSupportRequest {
  id: string;
}

export interface SupportRequestForStaff extends StoredSupportRequest {
  createdAt: string;
}

export interface SupportRequestStore {
  create(input: NewSupportRequest): Promise<StoredSupportRequest>;
  /** Newest first. Only validated requests are ever stored, so none that failed appear. */
  listByOrder(orderNumber: string): Promise<SupportRequestForStaff[]>;
}
