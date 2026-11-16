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

export interface SupportRequestStore {
  create(input: NewSupportRequest): Promise<StoredSupportRequest>;
}
