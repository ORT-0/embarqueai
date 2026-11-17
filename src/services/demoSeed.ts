/**
 * Dados de exemplo do modo de demonstração (EXPO_PUBLIC_API_URL=mock).
 * Espelham as contas de exemplo do banco real: duas rotas, dois grupos,
 * passageiros com ponto, acompanhamentos, ausências e histórico de viagens.
 * As datas são calculadas a partir de "hoje", para o histórico estar sempre recente.
 */
import {
  DEMO_AFTERNOON_ROUTE_NAME,
  DEMO_AFTERNOON_STOPS,
  DEMO_ROUTE_NAME,
  DEMO_ROUTE_STOPS,
} from '@/src/lib/demoRoute';
import { SEED } from '@/src/lib/ids';
import type {
  Absence,
  AlertReply,
  Boarding,
  Follow,
  Group,
  GroupMember,
  Profile,
  Route,
  RoutePoint,
  Trip,
  TripAlert,
  Vehicle,
} from '@/src/types/database';

const AFTERNOON_POINTS = [
  '66666666-6666-4666-8666-666666666671',
  '66666666-6666-4666-8666-666666666672',
  '66666666-6666-4666-8666-666666666673',
  '66666666-6666-4666-8666-666666666674',
];
const MORNING_POINTS = [SEED.pointA, SEED.pointB, SEED.pointC, SEED.pointD, SEED.pointE];

type Person = { key: string; name: string; phone: string; group: 'manha' | 'tarde' | null; point: number };

const PEOPLE: Person[] = [
  { key: 'ana', name: 'Ana Clara Souza', phone: '(62) 99811-2034', group: 'manha', point: 0 },
  { key: 'pedro', name: 'Pedro Henrique Lima', phone: '(62) 99652-7710', group: 'manha', point: 0 },
  { key: 'beatriz', name: 'Beatriz Rocha', phone: '(62) 98420-1185', group: 'manha', point: 1 },
  { key: 'lucas', name: 'Lucas Martins', phone: '(62) 99137-4402', group: 'manha', point: 2 },
  { key: 'maria', name: 'Maria Eduarda Alves', phone: '(62) 98276-9351', group: 'manha', point: 3 },
  { key: 'rafael', name: 'Rafael Oliveira', phone: '(62) 99504-6627', group: 'tarde', point: 0 },
  { key: 'juliana', name: 'Juliana Castro', phone: '(62) 98315-0249', group: 'tarde', point: 0 },
  { key: 'thiago', name: 'Thiago Ribeiro', phone: '(62) 99288-5163', group: 'tarde', point: 1 },
  { key: 'camila', name: 'Camila Duarte', phone: '(62) 98641-3870', group: 'tarde', point: 1 },
  { key: 'gustavo', name: 'Gustavo Nunes', phone: '(62) 99073-2918', group: 'tarde', point: 2 },
  { key: 'helena', name: 'Helena Antônio', phone: '(62) 98105-6634', group: null, point: 0 },
];

/** ID fixo e legível para cada pessoa de exemplo. */
function personId(index: number) {
  return `77777777-7777-4777-8777-${String(index + 1).padStart(12, '0')}`;
}

function emailOf(name: string) {
  const [first, ...rest] = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(' ');
  return `${first}.${rest[rest.length - 1]}@embarqueai.com`;
}

/** Data local AAAA-MM-DD. */
function ymd(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Os `count` últimos dias úteis antes de hoje (mais recente por último). */
function pastWeekdays(count: number, today: Date) {
  const out: Date[] = [];
  const day = new Date(today);
  while (out.length < count) {
    day.setDate(day.getDate() - 1);
    if (day.getDay() !== 0 && day.getDay() !== 6) out.unshift(new Date(day));
  }
  return out;
}

/** O n-ésimo próximo dia útil depois de hoje. */
function nextWeekday(n: number, today: Date) {
  const day = new Date(today);
  let found = 0;
  while (found < n) {
    day.setDate(day.getDate() + 1);
    if (day.getDay() !== 0 && day.getDay() !== 6) found += 1;
  }
  return day;
}

function at(day: Date, hhmm: string, plusMin = 0) {
  const [h, m] = hhmm.split(':').map(Number);
  const date = new Date(day);
  date.setHours(h, m + plusMin, 0, 0);
  return date.toISOString();
}

export function buildDemoData(clientId: string, transporterId: string, today = new Date()) {
  const profiles: Profile[] = PEOPLE.map((person, index) => ({
    id: personId(index),
    name: person.name,
    email: emailOf(person.name),
    phone: person.phone,
    role: 'client',
  }));
  const idOf = (key: string) => personId(PEOPLE.findIndex((person) => person.key === key));

  const vehicles: Vehicle[] = [
    { id: SEED.vehicleId, transporter_id: transporterId, type: 'Van', plate: 'MUT-1245', capacity: 15 },
    { id: SEED.microId, transporter_id: transporterId, type: 'Micro-ônibus', plate: 'RTA2E47', capacity: 28 },
  ];

  const routes: Route[] = [
    {
      id: SEED.routeId,
      transporter_id: transporterId,
      name: DEMO_ROUTE_NAME,
      status: 'stopped',
      outbound_time: '06:50',
      return_time: '12:20',
    },
    {
      id: SEED.afternoonRouteId,
      transporter_id: transporterId,
      name: DEMO_AFTERNOON_ROUTE_NAME,
      status: 'stopped',
      outbound_time: '13:10',
      return_time: '18:00',
    },
  ];

  const route_points: RoutePoint[] = [
    ...DEMO_ROUTE_STOPS.map((stop, index) => ({
      id: MORNING_POINTS[index],
      route_id: SEED.routeId,
      name: stop.name,
      lat: stop.lat,
      lng: stop.lng,
      sort_order: index,
    })),
    ...DEMO_AFTERNOON_STOPS.map((stop, index) => ({
      id: AFTERNOON_POINTS[index],
      route_id: SEED.afternoonRouteId,
      name: stop.name,
      lat: stop.lat,
      lng: stop.lng,
      sort_order: index,
    })),
  ];

  const groups: Group[] = [
    {
      id: SEED.groupId,
      name: 'Van do Afonso — Manhã',
      vehicle_id: SEED.vehicleId,
      route_id: SEED.routeId,
      transporter_id: transporterId,
    },
    {
      id: SEED.afternoonGroupId,
      name: 'Micro do Afonso — Tarde',
      vehicle_id: SEED.microId,
      route_id: SEED.afternoonRouteId,
      transporter_id: transporterId,
    },
  ];

  const group_members: GroupMember[] = [
    { group_id: SEED.groupId, user_id: clientId, point_id: SEED.pointB },
    ...PEOPLE.flatMap((person, index) =>
      person.group
        ? [
            {
              group_id: person.group === 'manha' ? SEED.groupId : SEED.afternoonGroupId,
              user_id: personId(index),
              point_id:
                person.group === 'manha' ? MORNING_POINTS[person.point] : AFTERNOON_POINTS[person.point],
            },
          ]
        : [],
    ),
  ];

  const now = today.toISOString();
  const follows: Follow[] = [
    { id: 'f0000000-0000-4000-8000-000000000001', guardian_id: clientId, passenger_id: idOf('ana'), status: 'accepted', created_at: now },
    { id: 'f0000000-0000-4000-8000-000000000002', guardian_id: idOf('helena'), passenger_id: clientId, status: 'pending', created_at: now },
  ];

  const days = pastWeekdays(6, today);
  const absences: Absence[] = [
    { group: SEED.groupId, user: idOf('pedro'), day: days[2] },
    { group: SEED.groupId, user: idOf('beatriz'), day: days[4] },
    { group: SEED.groupId, user: clientId, day: days[5] },
    { group: SEED.afternoonGroupId, user: idOf('juliana'), day: days[3] },
    { group: SEED.afternoonGroupId, user: idOf('gustavo'), day: days[5] },
    { group: SEED.groupId, user: idOf('lucas'), day: nextWeekday(2, today) },
    { group: SEED.afternoonGroupId, user: idOf('thiago'), day: nextWeekday(3, today) },
  ].map((item, index) => ({
    id: `a0000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    group_id: item.group,
    user_id: item.user,
    absent_on: ymd(item.day),
  }));

  const legs = [
    { route: SEED.routeId, group: SEED.groupId, leg: 'outbound' as const, time: '06:50', minutes: 38 },
    { route: SEED.routeId, group: SEED.groupId, leg: 'return' as const, time: '12:20', minutes: 41 },
    { route: SEED.afternoonRouteId, group: SEED.afternoonGroupId, leg: 'outbound' as const, time: '13:10', minutes: 33 },
    { route: SEED.afternoonRouteId, group: SEED.afternoonGroupId, leg: 'return' as const, time: '18:00', minutes: 46 },
  ];
  const trips: Trip[] = [];
  const boardings: Boarding[] = [];
  let tripNo = 0;
  for (const day of days) {
    for (const leg of legs) {
      tripNo += 1;
      const tripId = `b0000000-0000-4000-8000-${String(tripNo).padStart(12, '0')}`;
      trips.push({
        id: tripId,
        route_id: leg.route,
        group_id: leg.group,
        started_at: at(day, leg.time),
        ended_at: at(day, leg.time, leg.minutes),
        status: 'ended',
        leg: leg.leg,
        polyline: [],
      });
      const absent = new Set(
        absences.filter((item) => item.group_id === leg.group && item.absent_on === ymd(day)).map((item) => item.user_id),
      );
      group_members
        .filter((member) => member.group_id === leg.group && !absent.has(member.user_id))
        .forEach((member, index) => {
          boardings.push({
            id: `c${String(tripNo).padStart(7, '0')}-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
            trip_id: tripId,
            user_id: member.user_id,
            status: 'alighted',
            recorded_at: at(day, leg.time, leg.minutes - 2),
          });
        });
    }
  }

  // Aviso de atraso com resposta na ida da manhã de três dias úteis atrás.
  const alertTrip = trips.find(
    (trip) => trip.route_id === SEED.routeId && trip.leg === 'outbound' && trip.started_at === at(days[3], '06:50'),
  );
  const trip_alerts: TripAlert[] = alertTrip
    ? [
        {
          id: 'd0000000-0000-4000-8000-000000000001',
          trip_id: alertTrip.id,
          message: 'Trânsito intenso na Av. T-63. Atraso de cerca de 10 minutos.',
          created_at: at(days[3], '06:58'),
        },
      ]
    : [];
  const trip_alert_replies: AlertReply[] = trip_alerts.map((alert) => ({
    id: 'e0000000-0000-4000-8000-000000000001',
    alert_id: alert.id,
    user_id: clientId,
    message: 'Já estou no ponto',
  }));

  return {
    profiles,
    vehicles,
    routes,
    route_points,
    groups,
    group_members,
    follows,
    absences,
    trips,
    boardings,
    trip_alerts,
    trip_alert_replies,
  };
}
