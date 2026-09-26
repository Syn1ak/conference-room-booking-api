import { APIRequestContext, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { E2E_ADMIN } from './e2e-environment';

export type TAccount = {
  email: string;
  password: string;
  token: string;
  expiresAt: string;
  userId: string;
  role: 'Admin' | 'Client';
};

export type TService = { id: string; name: string; standardPrice: number };

export type TRoom = {
  id: string;
  name: string;
  capacity: number;
  hourlyPrice: number;
  services: { serviceId: string; name: string; price: number }[];
};

export type TBooking = { id: string; totalPrice: number; rentalPrice: number; status?: string };

export const CLIENT_PASSWORD = 'Client-Pass1!';

/** A name no other test uses, so tests never share rooms or services. */
export function uniqueName(prefix: string): string {
  return `${prefix} ${randomUUID().slice(0, 8)}`;
}

/**
 * Sets up data through the API, as a quicker and more precise alternative to clicking through the app, for everything
 * a test isn't about.
 */
export class Api {
  constructor(private readonly request: APIRequestContext) {}

  async registerClient(): Promise<TAccount> {
    const email = `client-${randomUUID()}@e2e.test`;
    const response = await this.request.post('/api/auth/register', {
      data: { email, password: CLIENT_PASSWORD },
    });
    expect(response.status(), await response.text()).toBe(201);

    return this.login(email, CLIENT_PASSWORD);
  }

  loginAdmin(): Promise<TAccount> {
    return this.login(E2E_ADMIN.email, E2E_ADMIN.password);
  }

  async login(email: string, password: string): Promise<TAccount> {
    const login = await this.request.post('/api/auth/login', { data: { email, password } });
    expect(login.status(), await login.text()).toBe(200);
    const { accessToken, expiresAt } = await login.json();

    const me = await this.request.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const user = await me.json();

    return {
      email,
      password,
      token: accessToken,
      expiresAt,
      userId: user.userId,
      role: user.roles.includes('Admin') ? 'Admin' : 'Client',
    };
  }

  async services(): Promise<TService[]> {
    return (await this.request.get('/api/services')).json();
  }

  async createService(
    admin: TAccount,
    service: { name?: string; standardPrice: number },
  ): Promise<TService> {
    const response = await this.request.post('/api/services', {
      headers: auth(admin),
      data: { name: service.name ?? uniqueName('Service'), standardPrice: service.standardPrice },
    });
    expect(response.status(), await response.text()).toBe(201);

    return response.json();
  }

  async createRoom(
    admin: TAccount,
    room: {
      name?: string;
      capacity?: number;
      hourlyPrice?: number;
      services?: { serviceId: string; price?: number }[];
    },
  ): Promise<TRoom> {
    const response = await this.request.post('/api/rooms', {
      headers: auth(admin),
      data: {
        name: room.name ?? uniqueName('Room'),
        capacity: room.capacity ?? 20,
        hourlyPrice: room.hourlyPrice ?? 1000,
        services: room.services ?? [],
      },
    });
    expect(response.status(), await response.text()).toBe(201);

    return response.json();
  }

  async updateRoom(
    admin: TAccount,
    room: TRoom,
    changes: Partial<Omit<TRoom, 'id' | 'services'>> & {
      services?: { serviceId: string; price?: number }[];
    },
  ): Promise<void> {
    const response = await this.request.put(`/api/rooms/${room.id}`, {
      headers: auth(admin),
      data: {
        name: changes.name ?? room.name,
        capacity: changes.capacity ?? room.capacity,
        hourlyPrice: changes.hourlyPrice ?? room.hourlyPrice,
        services:
          changes.services ??
          room.services.map((service) => ({ serviceId: service.serviceId, price: service.price })),
      },
    });
    expect(response.status(), await response.text()).toBe(200);
  }

  async deleteRoom(admin: TAccount, room: TRoom): Promise<void> {
    const response = await this.request.delete(`/api/rooms/${room.id}`, { headers: auth(admin) });
    expect(response.status(), await response.text()).toBe(204);
  }

  async book(
    client: TAccount,
    booking: {
      roomId: string;
      start: string;
      end: string;
      attendeeCount?: number;
      serviceIds?: string[];
    },
  ): Promise<TBooking> {
    const response = await this.request.post('/api/bookings', {
      headers: auth(client),
      data: { attendeeCount: 1, serviceIds: [], ...booking },
    });
    expect(response.status(), await response.text()).toBe(201);

    return response.json();
  }

  async cancel(client: TAccount, booking: TBooking): Promise<void> {
    const response = await this.request.post(`/api/bookings/${booking.id}/cancel`, {
      headers: auth(client),
    });
    expect(response.status(), await response.text()).toBe(200);
  }
}

function auth(account: TAccount): Record<string, string> {
  return { Authorization: `Bearer ${account.token}` };
}
