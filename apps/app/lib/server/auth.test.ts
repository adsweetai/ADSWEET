import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

// Inloggen met Supabase: een nieuw adres krijgt een account, de link gaat via Resend en anders via de mailer van Supabase.

const m = vi.hoisted(() => ({
  createUser: vi.fn(),
  generateLink: vi.fn(),
  signInWithOtp: vi.fn(),
  verifyOtp: vi.fn(),
  sendMail: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  env: { appUrl: "https://adsweet.test", supabaseUrl: "https://voorbeeld.supabase.co", supabaseAnonKey: "anon" },
  isDemo: false,
}));
vi.mock("./supabase", () => ({
  supabaseService: () => ({ auth: { admin: { createUser: m.createUser, generateLink: m.generateLink } } }),
  supabaseForRequest: async () => ({ auth: { signInWithOtp: m.signInWithOtp, verifyOtp: m.verifyOtp } }),
}));
vi.mock("./mail", () => ({ sendMail: m.sendMail }));

import { completeLogin, sendLoginLink } from "./auth";

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  process.env.RESEND_API_KEY = "re_test";
  m.createUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
  m.generateLink.mockResolvedValue({ data: { properties: { hashed_token: "h4sh" }, user: {} }, error: null });
  m.sendMail.mockResolvedValue({ id: "re_1" });
  m.signInWithOtp.mockResolvedValue({ error: null });
});

afterAll(() => {
  delete process.env.RESEND_API_KEY;
});

describe("Inloglink", () => {
  it("maakt een nieuw adres aan en stuurt de link via Resend", async () => {
    expect(await sendLoginLink(" Marco@Voorbeeld.be ", "/campagnes")).toEqual({ ok: true });
    expect(m.createUser).toHaveBeenCalledWith({ email: "marco@voorbeeld.be", email_confirm: true });
    expect(m.generateLink).toHaveBeenCalledWith({ type: "magiclink", email: "marco@voorbeeld.be" });
    expect(m.sendMail).toHaveBeenCalledWith("login", "marco@voorbeeld.be", {
      url: "https://adsweet.test/auth/callback?token_hash=h4sh&next=%2Fcampagnes",
    });
    expect(m.signInWithOtp).not.toHaveBeenCalled();
  });

  it("een bestaand account krijgt gewoon een link, en twee keer klikken geeft één mail", async () => {
    m.createUser.mockResolvedValue({
      data: { user: null },
      error: { status: 422, code: "email_exists", message: "A user with this email address has already been registered" },
    });
    expect(await sendLoginLink("pj@voorbeeld.be")).toEqual({ ok: true });
    expect(await sendLoginLink("pj@voorbeeld.be")).toEqual({ ok: true });
    expect(m.sendMail).toHaveBeenCalledTimes(1);
  });

  it("weigert Resend de mail, dan gaat hij via Supabase", async () => {
    m.sendMail.mockResolvedValue(null);
    expect(await sendLoginLink("eva@voorbeeld.be")).toEqual({ ok: true });
    expect(m.signInWithOtp).toHaveBeenCalledWith({
      email: "eva@voorbeeld.be",
      options: { shouldCreateUser: false, emailRedirectTo: "https://adsweet.test/auth/callback?next=%2Fvandaag" },
    });
  });

  it("zonder sleutel van Resend stuurt Supabase de link", async () => {
    delete process.env.RESEND_API_KEY;
    expect(await sendLoginLink("bram@voorbeeld.be")).toEqual({ ok: true });
    expect(m.createUser).toHaveBeenCalled();
    expect(m.generateLink).not.toHaveBeenCalled();
    expect(m.signInWithOtp).toHaveBeenCalled();
  });

  it("lukt het aanmaken niet, dan een foutmelding en geen mail", async () => {
    m.createUser.mockResolvedValue({ data: { user: null }, error: { status: 500, code: "unexpected_failure", message: "Database error" } });
    expect(await sendLoginLink("tom@voorbeeld.be")).toEqual({ ok: false, error: "fout" });
    expect(m.sendMail).not.toHaveBeenCalled();
    expect(m.signInWithOtp).not.toHaveBeenCalled();
  });

  it("de link uit de mail logt in", async () => {
    m.verifyOtp.mockResolvedValue({ error: null });
    expect(await completeLogin(new URLSearchParams("token_hash=h4sh&next=%2Fcampagnes"))).toEqual({ ok: true, next: "/campagnes" });
    expect(m.verifyOtp).toHaveBeenCalledWith({ token_hash: "h4sh", type: "magiclink" });
    m.verifyOtp.mockResolvedValue({ error: { message: "Token has expired or is invalid" } });
    expect(await completeLogin(new URLSearchParams("token_hash=oud"))).toEqual({ ok: false, next: "/vandaag" });
  });
});
