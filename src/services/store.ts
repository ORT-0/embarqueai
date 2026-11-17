/**
 * Persistência local do MVP (memória + AsyncStorage).
 * Trocar este módulo por Postgres + RLS no Supabase quando o backend existir.
 * Cloudflare não substitui este armazenamento.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { buildDemoData } from '@/src/services/demoSeed';
import { DEMO_ACCOUNTS, EMAIL_ALIASES, MOCK_PASSWORD, SEED } from '@/src/lib/ids';
import type {
  Absence,
  Boarding,
  Follow,
  Group,
  AlertReply,
  TripAlert,
  GroupMember,
  Profile,
  Route,
  RoutePoint,
  Trip,
  TripPosition,
  Vehicle,
} from '@/src/types/database';

// v4: dados de exemplo mais completos. As versões anteriores são descartadas de propósito.
const STORAGE_KEY = '@embarqueai/mock-db-v4';
const LEGACY_KEYS: string[] = [];

export type Credential = {
  email: string;
  password: string;
  user_id: string;
};

export type MockDb = {
  profiles: Profile[];
  vehicles: Vehicle[];
  routes: Route[];
  route_points: RoutePoint[];
  groups: Group[];
  group_members: GroupMember[];
  trips: Trip[];
  trip_positions: TripPosition[];
  boardings: Boarding[];
  absences: Absence[];
  follows: Follow[];
  trip_alerts: TripAlert[];
  trip_alert_replies: AlertReply[];
  pending_accounts: {
    id: string;
    email: string;
    password: string;
    name: string;
    role: Profile['role'];
    phone: string | null;
  }[];
  credentials: Credential[];
  pending_otp_email: string | null;
};

function seedDb(): MockDb {
  const demo = buildDemoData(SEED.clientId, SEED.transporterId);
  return {
    profiles: [
      {
        id: SEED.clientId,
        name: 'José Antônio de Paula',
        email: DEMO_ACCOUNTS.client.email,
        phone: '(62) 99999-1111',
        role: 'client',
      },
      {
        id: SEED.transporterId,
        name: 'Afonso de Souza Bezerra',
        email: DEMO_ACCOUNTS.transporter.email,
        phone: '(62) 98888-2222',
        role: 'transporter',
      },
      ...demo.profiles,
    ],
    credentials: [
      {
        email: DEMO_ACCOUNTS.client.email,
        password: MOCK_PASSWORD,
        user_id: SEED.clientId,
      },
      {
        email: DEMO_ACCOUNTS.transporter.email,
        password: MOCK_PASSWORD,
        user_id: SEED.transporterId,
      },
    ],
    vehicles: demo.vehicles,
    routes: demo.routes,
    route_points: demo.route_points,
    groups: demo.groups,
    group_members: demo.group_members,
    trips: demo.trips,
    trip_positions: [],
    boardings: demo.boardings,
    absences: demo.absences,
    follows: demo.follows,
    trip_alerts: demo.trip_alerts,
    trip_alert_replies: demo.trip_alert_replies,
    pending_accounts: [],
    pending_otp_email: null,
  };
}

function ensureDemoAccounts(db: MockDb): void {
  const demos = [
    {
      id: SEED.clientId,
      email: DEMO_ACCOUNTS.client.email,
      name: 'José Antônio de Paula',
      phone: '(62) 99999-1111' as const,
      role: 'client' as const,
    },
    {
      id: SEED.transporterId,
      email: DEMO_ACCOUNTS.transporter.email,
      name: 'Afonso de Souza Bezerra',
      phone: '(62) 98888-2222' as const,
      role: 'transporter' as const,
    },
  ];

  for (const demo of demos) {
    const profile = db.profiles.find((p) => p.id === demo.id);
    if (profile) {
      profile.email = demo.email;
      profile.role = demo.role;
    } else {
      db.profiles.push({
        id: demo.id,
        name: demo.name,
        email: demo.email,
        phone: demo.phone,
        role: demo.role,
      });
    }

    const cred = db.credentials.find((c) => c.user_id === demo.id);
    if (cred) {
      cred.email = demo.email;
      cred.password = MOCK_PASSWORD;
    } else {
      db.credentials.push({
        email: demo.email,
        password: MOCK_PASSWORD,
        user_id: demo.id,
      });
    }
  }

  const demoIds = new Set<string>(demos.map((d) => d.id));
  const reservedEmails = new Set(
    [
      ...demos.map((d) => d.email),
      ...Object.keys(EMAIL_ALIASES),
      ...Object.values(EMAIL_ALIASES),
    ].map((email) => email.toLowerCase()),
  );

  db.credentials = db.credentials.filter((c) => {
    if (demoIds.has(c.user_id)) return true;
    return !reservedEmails.has(c.email.toLowerCase());
  });
}

let memory: MockDb | null = null;
let loadPromise: Promise<void> | null = null;

async function persist(): Promise<void> {
  if (!memory) return;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
}

export async function loadDb(): Promise<MockDb> {
  if (memory) return memory;
  if (!loadPromise) {
    loadPromise = (async () => {
      let raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) {
        for (const key of LEGACY_KEYS) {
          raw = await AsyncStorage.getItem(key);
          if (raw) break;
        }
      }
      if (raw) {
        memory = JSON.parse(raw) as MockDb;
        memory.boardings ??= [];
        memory.absences ??= [];
        memory.follows ??= [];
        memory.trip_alerts ??= [];
        memory.trip_alert_replies ??= [];
        memory.pending_accounts ??= [];
        memory.trip_positions ??= [];
        ensureDemoAccounts(memory);
        await persist();
      } else {
        memory = seedDb();
        await persist();
      }
    })();
  }
  await loadPromise;
  if (!memory) {
    memory = seedDb();
  }
  return memory;
}

export async function mutateDb(updater: (db: MockDb) => void): Promise<MockDb> {
  const db = await loadDb();
  updater(db);
  await persist();
  return db;
}

export async function resetDb(): Promise<void> {
  memory = seedDb();
  await persist();
}
