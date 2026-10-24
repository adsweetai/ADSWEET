import "server-only";
import { today } from "@/lib/clock";
import { graphAll, graphGet } from "./graph";
import { accountStatus, pixelOk } from "./map";

// Wat de sleutel van de systeemgebruiker mag zien: advertentieaccounts, Facebook-pagina's (met Instagram) en pixels.

export interface MetaAccountOption {
  id: string;
  name: string;
  currency: string;
  status: "actief" | "betaalprobleem" | "uitgeschakeld";
  business: string | null;
}

export interface MetaPageOption {
  id: string;
  name: string;
  ig: { id: string; username: string } | null;
}

export interface MetaPixelOption {
  id: string;
  name: string;
  ok: boolean;
}

const byName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name, "nl");

export async function listMetaAccounts(): Promise<MetaAccountOption[]> {
  const rows = await graphAll<{ id: string; name: string; account_status?: number; currency?: string; business?: { name?: string } }>("me/adaccounts", {
    fields: "id,name,account_status,currency,business{name}",
    limit: 200,
  });
  return rows
    .map((a) => ({ id: a.id, name: a.name, currency: a.currency ?? "EUR", status: accountStatus(a.account_status), business: a.business?.name ?? null }))
    .sort(byName);
}

export async function listMetaPages(): Promise<MetaPageOption[]> {
  const rows = await graphAll<{ id: string; name: string; instagram_business_account?: { id: string; username?: string } }>("me/accounts", {
    fields: "id,name,instagram_business_account{id,username}",
    limit: 200,
  }).catch(() => []);
  return rows
    .map((p) => ({
      id: p.id,
      name: p.name,
      ig: p.instagram_business_account ? { id: p.instagram_business_account.id, username: p.instagram_business_account.username ?? "" } : null,
    }))
    .sort(byName);
}

export async function listMetaPixels(accountId: string): Promise<MetaPixelOption[]> {
  if (!/^act_\d+$/.test(accountId)) return [];
  const rows = await graphAll<{ id: string; name: string; last_fired_time?: string }>(`${accountId}/adspixels`, {
    fields: "id,name,last_fired_time",
    limit: 50,
  }).catch(() => []);
  const day = today();
  return rows.map((p) => ({ id: p.id, name: p.name, ok: pixelOk(p.last_fired_time, day) })).sort(byName);
}

export async function metaAccountInfo(accountId: string) {
  return graphGet<{ id: string; name: string; account_status?: number; currency?: string; timezone_name?: string }>(accountId, {
    fields: "name,account_status,currency,timezone_name",
  });
}
