import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

// Inloggen in Beheer met Supabase: alleen een AdSweet-beheerder krijgt een link, via Resend, rechtstreeks naar Beheer.
// De database is de demodatabase van Beheer (team@adsweet.voorbeeld is beheerder, Lisa niet).

const m = vi.hoisted(() => ({ generateLink: vi.fn(), sendMail: vi.fn(), signInWithOtp: vi.fn(), verifyOtp: vi.fn() }));

vi.mock("@/lib/env", () => ({
  env: { beheerUrl: "https://beheer.test", appUrl: "https://app.test", supabaseUrl: "https://voorbeeld.supabase.co", supabaseAnonKey: "anon" },
  isDemo: false,
}));
vi.mock("./supabase", () => ({
  supabaseService: () => ({ auth: { admin: { generateLink: m.generateLink } } }),
  supabaseForRequest: async () => ({ auth: { signInWithOtp: m.signInWithOtp, verifyOtp: m.verifyOtp } }),
}));
vi.mock("./mail", () => ({ sendMail: m.sendMail }));
vi.mock("@adsweet/db/server", async (orig) => {
  const real = await orig<typeof import("@adsweet/db/server")>();
  const demo = real.createDemoDatabase();
  return { ...real, supabaseExecutor: () => real.pgliteExecutor(demo, null) };
});

import { completeLogin, sendLoginLink } from "./auth";

beforeEach(() => {
  vi.clearAllMocks();
  process.env.RESEND_API_KEY = "re_test";
  m.generateLink.mockResolvedValue({ data: { properties: { hashed_token: "h4sh" } }, error: null });
  m.sendMail.mockResolvedValue({ id: "re_1" });
});

afterAll(() => {
  delete process.env.RESEND_API_KEY;
});

describe("Inloggen in Beheer", () => {
  it("een beheerder krijgt een link via Resend, rechtstreeks naar Beheer", async () => {
    expect(await sendLoginLink(" Team@AdSweet.voorbeeld ")).toEqual({ ok: true });
    expect(m.generateLink).toHaveBeenCalledWith({ type: "magiclink", email: "team@adsweet.voorbeeld" });
    expect(m.sendMail).toHaveBeenCalledWith("login", "team@adsweet.voorbeeld", { url: "https://beheer.test/auth/callback?token_hash=h4sh" });
  });

  it("een klant of een onbekend adres krijgt niets, zonder dat te verraden", async () => {
    expect(await sendLoginLink("lisa@ateliernoor.voorbeeld")).toEqual({ ok: true });
    expect(await sendLoginLink("niemand@voorbeeld.be")).toEqual({ ok: true });
    expect(m.generateLink).not.toHaveBeenCalled();
    expect(m.sendMail).not.toHaveBeenCalled();
    expect(m.signInWithOtp).not.toHaveBeenCalled();
  });

  it("de link uit de mail logt in", async () => {
    m.verifyOtp.mockResolvedValue({ error: null });
    expect(await completeLogin(new URLSearchParams("token_hash=h4sh"))).toEqual({ ok: true, next: "/playbook" });
    expect(m.verifyOtp).toHaveBeenCalledWith({ token_hash: "h4sh", type: "magiclink" });
  });
});
