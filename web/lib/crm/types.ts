export type CrmPipelineStep = {
  id: number;
  name: string;
  color: string | null;
  order: number | null;
  pipelineId: number | null;
};

export type CrmPipeline = {
  id: number;
  name: string;
  currency: string;
  commercialSteps: CrmPipelineStep[];
};

export type CrmContact = {
  id: number;
  name: string;
  number: string;
  email: string;
  isGroup: boolean;
  tags?: { id: number; name: string; color: string }[];
};

export type CrmCommercialOrder = {
  id: number;
  observation: string | null;
  amount: string;
  status: string;
  wonAt: string | null;
  lostAt: string | null;
  lostReason: string | null;
  contactId: number;
  commercialSalesStepId: number;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  contact?: CrmContact;
  commercialSalesStep?: {
    id: number;
    name: string;
    order: number | null;
    color: string | null;
    pipelineId: number;
    pipeline?: { id: number; name: string };
  };
};

export type CrmListResponse<T> = {
  data: T[];
  pagination?: { page: number; limit: number; total: number; totalPages: number };
};

export type CrmWebhookEvent =
  | "COMMERCIAL_ORDER_STEP_CHANGED"
  | "COMMERCIAL_ORDER_CREATED"
  | "COMMERCIAL_ORDER_CHANGED"
  | "CONTACT_CREATED"
  | "CONTACT_UPDATED"
  | "TICKET_CREATED"
  | "TICKET_STATUS_CHANGED"
  | "TICKET_ASSIGNED"
  | "MEETING_CREATED"
  | "TAG_APPLIED";

export type CrmWebhookPayload = {
  event: CrmWebhookEvent;
  data: unknown;
};
