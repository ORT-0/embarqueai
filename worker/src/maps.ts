import { HTTPException } from 'hono/http-exception';

import { decodePolyline, mockGeocode, pathLengthM, type LatLng } from './geo';

type DirectionsOk = {
  coordinates: { latitude: number; longitude: number }[];
  points: LatLng[];
  distance_m: number;
};

/** Resultado amplo demais para ser um ponto de parada (o país ou o estado inteiro). */
const COARSE_TYPES = new Set(['country', 'administrative_area_level_1']);

/** Margem, em graus, em volta dos pontos já conhecidos da rota (~30 km). */
const NEAR_MARGIN_DEG = 0.27;

function nearBounds(near: LatLng[]): string | null {
  const valid = near.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  if (!valid.length) return null;
  const lats = valid.map((p) => p.lat);
  const lngs = valid.map((p) => p.lng);
  const south = Math.min(...lats) - NEAR_MARGIN_DEG;
  const north = Math.max(...lats) + NEAR_MARGIN_DEG;
  const west = Math.min(...lngs) - NEAR_MARGIN_DEG;
  const east = Math.max(...lngs) + NEAR_MARGIN_DEG;
  return `${south},${west}|${north},${east}`;
}

/**
 * Converte o endereço digitado em coordenadas. A busca fica no Brasil e dá
 * preferência à região dos pontos em `near` (os outros pontos da mesma rota).
 * Endereço não encontrado é erro: nunca devolve uma coordenada inventada
 * quando há chave do Google configurada.
 */
export async function geocodeAddress(
  env: Env,
  query: string,
  near: LatLng[] = [],
): Promise<LatLng> {
  const text = (query ?? '').trim();
  if (text.length < 3) {
    throw new HTTPException(400, { message: 'Informe o endereço ou o nome do ponto.' });
  }
  const key = env.GOOGLE_MAPS_SERVER_KEY?.trim();
  // Sem chave (ambiente local de desenvolvimento): coordenada de demonstração.
  if (!key) return mockGeocode(text);

  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('address', text);
  url.searchParams.set('components', 'country:BR');
  url.searchParams.set('region', 'br');
  url.searchParams.set('language', 'pt-BR');
  const bounds = nearBounds(near);
  if (bounds) url.searchParams.set('bounds', bounds);
  url.searchParams.set('key', key);

  const unavailable = new HTTPException(502, {
    message: 'Não foi possível consultar o endereço agora. Tente de novo em instantes.',
  });
  let data: {
    status: string;
    results?: { types?: string[]; geometry: { location: { lat: number; lng: number } } }[];
  };
  try {
    const res = await fetch(url);
    data = (await res.json()) as typeof data;
  } catch {
    throw unavailable;
  }
  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    console.error('geocode falhou:', data.status);
    throw unavailable;
  }
  // Com o filtro de país, um texto sem correspondência devolve o próprio país.
  const hit = (data.results ?? []).find(
    (result) => !(result.types ?? []).some((type) => COARSE_TYPES.has(type)),
  );
  if (!hit) {
    throw new HTTPException(400, {
      message: `Não encontramos o endereço "${text}". Confira a rua, o número e a cidade.`,
    });
  }
  return { lat: hit.geometry.location.lat, lng: hit.geometry.location.lng };
}

/** Junta a polilinha de cada passo de cada trecho, sem repetir o ponto de emenda. */
function detailedPath(
  legs: { steps?: { polyline?: { points: string } }[] }[] | undefined,
): LatLng[] {
  const out: LatLng[] = [];
  for (const leg of legs ?? []) {
    for (const step of leg.steps ?? []) {
      if (!step.polyline?.points) continue;
      for (const p of decodePolyline(step.polyline.points)) {
        const last = out[out.length - 1];
        if (last && last.lat === p.lat && last.lng === p.lng) continue;
        out.push(p);
      }
    }
  }
  return out;
}

export async function directions(env: Env, points: LatLng[]): Promise<DirectionsOk> {
  if (points.length < 2) {
    const coords = points.map((p) => ({ latitude: p.lat, longitude: p.lng }));
    return { coordinates: coords, points, distance_m: 0 };
  }

  const key = env.GOOGLE_MAPS_SERVER_KEY?.trim();
  if (key) {
    const origin = `${points[0].lat},${points[0].lng}`;
    const destination = `${points[points.length - 1].lat},${points[points.length - 1].lng}`;
    const url = new URL('https://maps.googleapis.com/maps/api/directions/json');
    url.searchParams.set('origin', origin);
    url.searchParams.set('destination', destination);
    url.searchParams.set('key', key);
    if (points.length > 2) {
      url.searchParams.set(
        'waypoints',
        points
          .slice(1, -1)
          .map((p) => `${p.lat},${p.lng}`)
          .join('|'),
      );
    }
    const res = await fetch(url);
    const data = (await res.json()) as {
      status: string;
      routes?: {
        overview_polyline?: { points: string };
        legs?: {
          distance?: { value: number };
          steps?: { polyline?: { points: string } }[];
        }[];
      }[];
    };
    const route = data.routes?.[0];
    if (data.status === 'OK' && route?.overview_polyline?.points) {
      // O overview_polyline é simplificado e corta esquinas; os steps seguem a rua.
      const detailed = detailedPath(route.legs);
      const decoded = detailed.length >= 2 ? detailed : decodePolyline(route.overview_polyline.points);
      const distance_m =
        route.legs?.reduce((sum, leg) => sum + (leg.distance?.value ?? 0), 0) ??
        Math.round(pathLengthM(decoded));
      return {
        points: decoded,
        coordinates: decoded.map((p) => ({ latitude: p.lat, longitude: p.lng })),
        distance_m,
      };
    }
  }

  return {
    points,
    coordinates: points.map((p) => ({ latitude: p.lat, longitude: p.lng })),
    distance_m: Math.round(pathLengthM(points)),
  };
}
