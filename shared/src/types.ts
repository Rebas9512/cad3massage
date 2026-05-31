import type { BookingStatus, ServiceCategory } from './enums.js';

export interface ServiceDTO {
  id: string;
  code: string;
  name: string;
  category: ServiceCategory;
  description: string;
  durationMinutes: number;
  priceCents: number;
  currency: 'USD';
}

export interface TherapistDTO {
  id: string;
  name: string;
  bio: string | null;
  photoUrl: string | null;
}

export interface SlotDTO {
  startAt: string; // ISO8601 with offset
  endAt: string;
}

export interface AvailabilityResponse {
  serviceId: string;
  days: Array<{
    date: string; // YYYY-MM-DD (CT)
    therapists: Array<{ therapistId: string; slots: SlotDTO[] }>;
  }>;
}

export interface BookingDTO {
  id: string;
  confirmationCode: string;
  status: BookingStatus;
  startAt: string;
  endAt: string;
  service: Pick<ServiceDTO, 'id' | 'code' | 'name' | 'durationMinutes' | 'priceCents' | 'currency'>;
  therapist: Pick<TherapistDTO, 'id' | 'name'>;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerNote: string | null;
}

export interface ApiError {
  error: { code: string; message: string; details?: unknown };
}
