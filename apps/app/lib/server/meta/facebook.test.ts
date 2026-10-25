import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

// "Doorgaan met Facebook" voor de koppeling: het venster, de code omwisselen, de sleutel van 60 dagen bewaren in
// Supabase Vault (nagemaakt) en ermee werken. Met nagemaakte antwoorden van Meta.

const m = vi.hoisted(() => ({ rpc: vi.fn(), calls: [] as URL[] }));

vi.mock("@/lib/env", () => ({ env: { appUrl: "https://adsweet.test" }, isDemo: false }));
vi.mock("../supabase", () => ({ supabaseService: () => ({ rpc: m.rpc }) }));

import { metaToken, withMetaToken } from "./graph";
import { dialogUrl, exchangeCode } from "./oauth";
import { saveUserMetaToken, userMetaToken } from "./tokens";

const META: Record<string, ((u: URL) => unknown) | undefined> = {
  "oauth/access_token": (u) =>
    u.searchParams.get("grant_type") === "fb_exchange_token"
      ? { access_token: `lang-${u.searchParams.get("fb_exchange_token")}`, expires_in: 5_184_000 }
      : { access_token: "kort-uit-code", expires_in: 3600 },
  me: () => ({ id: "fb-77", name: "Pieter-Jan" }),
};

beforeEach(() => {
  m.calls.length = 0;
  m.rpc.mockReset();
  process.env.META_APP_ID = "123";
  process.env.META_APP_SECRET = "geheim";
  process.env.META_SYSTEM_TOKEN = "systeemsleutel-van-de-systeemgebruiker";
  delete process.env.META_LOGIN_CONFIG_ID;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL) => {
      const u = new URL(String(input));
      m.calls.push(u);
      const answer = META[u.pathname.replace(/^\/v\d+\.\d+\//, "")];
      return new Response(JSON.stringify(answer ? answer(u) : { error: { message: "onbekend", code: 100 } }), { status: answer ? 200 : 400 });
    }),
  );
});

afterAll(() => {
  vi.unstubAllGlobals();
  for (const k of ["META_APP_ID", "META_APP_SECRET", "META_SYSTEM_TOKEN"]) delete process.env[k];
});

describe("Doorgaan met Facebook", () => {
  it("opent het venster van Meta met de rechten, of met de configuratie van Facebook Login for Business", () => {
    const u = new URL(dialogUrl("staat1", "https://adsweet.test/auth/meta/callback"));
    expect(u.origin + u.pathname).toBe("https://www.facebook.com/v24.0/dialog/oauth");
    expect(u.searchParams.get("client_id")).toBe("123");
    expect(u.searchParams.get("state")).toBe("staat1");
    expect(u.searchParams.get("redirect_uri")).toBe("https://adsweet.test/auth/meta/callback");
    expect(u.searchParams.get("scope")?.split(",")).toEqual(expect.arrayContaining(["ads_read", "business_management", "pages_show_list"]));

    process.env.META_LOGIN_CONFIG_ID = "cfg-9";
    const c = new URL(dialogUrl("staat2", "https://adsweet.test/auth/meta/callback"));
    expect(c.searchParams.get("config_id")).toBe("cfg-9");
    expect(c.searchParams.has("scope")).toBe(false);
  });

  it("wisselt de code om met het app-geheim, alleen op de server", async () => {
    expect(await exchangeCode("code-1", "https://adsweet.test/auth/meta/callback")).toEqual({ token: "kort-uit-code", expiresIn: 3600 });
    const call = m.calls[0];
    expect(call.pathname).toBe("/v24.0/oauth/access_token");
    expect(call.searchParams.get("client_secret")).toBe("geheim");
    expect(call.searchParams.get("code")).toBe("code-1");
  });

  it("bewaart een sleutel van 60 dagen in de kluis, met de naam op Facebook", async () => {
    m.rpc.mockResolvedValue({ data: null, error: null });
    const before = Date.now();
    expect(await saveUserMetaToken("user-1", "kort-sleutel-uit-het-venster")).toEqual({ name: "Pieter-Jan" });
    const me = m.calls.find((u) => u.pathname.endsWith("/me"))!;
    expect(me.searchParams.get("access_token")).toBe("lang-kort-sleutel-uit-het-venster");
    expect(me.searchParams.get("appsecret_proof")).toMatch(/^[0-9a-f]{64}$/);
    const [fn, args] = m.rpc.mock.calls[0];
    expect(fn).toBe("save_meta_token");
    expect(args).toMatchObject({ p_user: "user-1", p_token: "lang-kort-sleutel-uit-het-venster", p_fb_user: "fb-77", p_fb_name: "Pieter-Jan" });
    const days = (Date.parse(args.p_expires) - before) / 86_400_000;
    expect(days).toBeGreaterThan(59.9);
    expect(days).toBeLessThan(60.1);
  });

  it("lukt bewaren niet (bv. de databasefuncties ontbreken), dan een fout", async () => {
    m.rpc.mockResolvedValue({ data: null, error: { message: "Could not find the function public.save_meta_token" } });
    await expect(saveUserMetaToken("user-1", "kort-sleutel-uit-het-venster")).rejects.toThrow(/niet bewaard/);
  });

  it("leest de sleutel van een gebruiker en werkt ermee; zonder sleutel die van de systeemgebruiker", async () => {
    m.rpc.mockResolvedValue({ data: "sleutel-van-pieter-jan", error: null });
    const token = await userMetaToken("user-1");
    expect(m.rpc).toHaveBeenCalledWith("meta_token", { p_user: "user-1" });
    expect(await withMetaToken(token, async () => metaToken())).toBe("sleutel-van-pieter-jan");
    expect(await withMetaToken(null, async () => metaToken())).toBe("systeemsleutel-van-de-systeemgebruiker");
    expect(metaToken()).toBe("systeemsleutel-van-de-systeemgebruiker");

    // De sleutel van de systeemgebruiker mag ook META_TOKEN heten (zoals in agency-hub).
    delete process.env.META_SYSTEM_TOKEN;
    process.env.META_TOKEN = "sleutel-onder-de-naam-van-agency-hub";
    expect(metaToken()).toBe("sleutel-onder-de-naam-van-agency-hub");
    delete process.env.META_TOKEN;

    m.rpc.mockResolvedValue({ data: null, error: { message: "kapot" } });
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await userMetaToken("user-1")).toBeNull();
    expect(await userMetaToken(null)).toBeNull();
  });
});
