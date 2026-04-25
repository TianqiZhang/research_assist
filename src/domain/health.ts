export interface HealthResponse {
  ok: true;
  service: "research-assistant";
}

export function getHealth(): HealthResponse {
  return {
    ok: true,
    service: "research-assistant"
  };
}
