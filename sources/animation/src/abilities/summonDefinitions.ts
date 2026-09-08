export type SummonKind = 'skeleton' | 'imp';
/** Extra inspection time after cast recovery, not a gameplay summon lifetime. */
export const SUMMON_TAIL = 5.8;
export function summonKind(id: string): SummonKind | null {
  return id === 'raise-skeleton' ? 'skeleton' : id === 'summon-imp' ? 'imp' : null;
}
