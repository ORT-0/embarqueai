/** Paradas demo em Goiânia (coords reais, OpenStreetMap). Usadas no seed local. */
export const DEMO_ROUTE_STOPS = [
  { name: 'Parque Areião — Setor Pedro Ludovico', lat: -16.70633, lng: -49.25567 },
  { name: 'Parque Vaca Brava — Setor Bueno', lat: -16.70958, lng: -49.27076 },
  { name: 'Praça Tamandaré — Setor Oeste', lat: -16.68572, lng: -49.26517 },
  { name: 'Bosque dos Buritis — Setor Oeste', lat: -16.68184, lng: -49.26194 },
  { name: 'Praça Cívica — Centro (escola)', lat: -16.68094, lng: -49.25634 },
] as const;

export const DEMO_ROUTE_NAME = 'Rota Manhã — Centro';

export const DEMO_AFTERNOON_STOPS = [
  { name: 'Terminal Praça A — Campinas', lat: -16.67342, lng: -49.28449 },
  { name: 'Lago das Rosas — Setor Oeste', lat: -16.68185, lng: -49.2728 },
  { name: 'Mercado Central — Rua 3, Centro', lat: -16.67441, lng: -49.254 },
  { name: 'Praça Universitária — Setor Universitário', lat: -16.67701, lng: -49.24412 },
] as const;

export const DEMO_AFTERNOON_ROUTE_NAME = 'Rota Tarde — Setor Universitário';
