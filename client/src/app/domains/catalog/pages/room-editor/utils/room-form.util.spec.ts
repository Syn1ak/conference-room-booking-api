import { IRoom } from '../../../../../core/entities/rooms/room.dto';
import { toRoomForm, toRoomRequest } from './room-form.util';

const CATALOG = [
  { id: 'p', name: 'Projector', standardPrice: 500 },
  { id: 'w', name: 'Wi-Fi', standardPrice: 300 },
  { id: 's', name: 'Sound', standardPrice: 700 },
];

describe('room form mapping', () => {
  it('lists every catalog service for a new room, none of them offered', () => {
    const form = toRoomForm(null, CATALOG);

    expect(form.services.map((service) => [service.name, service.offered, service.price])).toEqual([
      ['Projector', false, null],
      ['Wi-Fi', false, null],
      ['Sound', false, null],
    ]);
  });

  it("ticks a room's services and keeps its own prices only where they differ from the standard", () => {
    const room: IRoom = {
      id: 'a',
      name: 'Room A',
      capacity: 50,
      hourlyPrice: 2000,
      services: [
        { serviceId: 'p', name: 'Projector', price: 450 },
        { serviceId: 'w', name: 'Wi-Fi', price: 300 },
      ],
    };

    const form = toRoomForm(room, CATALOG);

    expect(form.services.map((service) => [service.name, service.offered, service.price])).toEqual([
      ['Projector', true, 450],
      ['Wi-Fi', true, null],
      ['Sound', false, null],
    ]);
  });

  it('sends the offered services only, with a price only where one was set', () => {
    const form = toRoomForm(null, CATALOG);
    form.name = '  Room D ';
    form.services[0] = { ...form.services[0], offered: true, price: 450 };
    form.services[1] = { ...form.services[1], offered: true, price: null };
    form.services[2] = { ...form.services[2], offered: false, price: 900 };

    expect(toRoomRequest(form)).toEqual({
      name: 'Room D',
      capacity: 10,
      hourlyPrice: 1000,
      services: [{ serviceId: 'p', price: 450 }, { serviceId: 'w' }],
    });
  });

  it('treats a cleared price as none', () => {
    const form = toRoomForm(null, CATALOG);
    form.services[0] = { ...form.services[0], offered: true, price: Number.NaN };

    expect(toRoomRequest(form).services).toEqual([{ serviceId: 'p' }]);
  });
});
