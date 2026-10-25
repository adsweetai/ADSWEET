import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

// Inloggen met Supabase: een nieuw adres krijgt een account, de link gaat via Resend en anders via de mailer van Supabase.

const m = vi.hoisted(() => ({
  createUser: vi.fn(),
  generateLink: vi.fn(),
  signInWithOtp: vi.fn(),
  verifyOtp: vi.fn(),
  exchangeCodeForSession: vi.fn(),
  signInWithOAuth: vi.fn(),
  sendMail: vi.fn(),
  saveUserMetaToken: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  env: { appUrl: "https://adsweet.test", supabaseUrl: "https://voorbeeld.supabase.co", supabaseAnonKey: "anon" },
  isDemo: false,
}));
vi.mock("./supabase", () => ({
  supabaseService: () => ({ auth: { admin: { createUser: m.createUser, generateLink: m.generateLink } } }),
  supabaseForRequest: async () => ({
    auth: { signInWithOtp: m.signInWithOtp, verifyOtp: m.verifyOtp, exchangeCodeForSession: m.exchangeCodeForSession, signInWithOAuth: m.signInWithOAuth },
  }),
}));
vi.mock("./mail", () => ({ sendMail: m.sendMail }));
vi.mock("./meta/tokens", () => ({ saveUserMetaToken: m.saveUserMetaToken }));

import { completeLogin, facebookSignInUrl, sendLoginLink } from "./auth";

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

  it("weigert Resend de mail (bv. een domein dat niet bevestigd is), dan een foutmelding", async () => {
    m.sendMail.mockResolvedValue(null);
    expect(await sendLoginLink("eva@voorbeeld.be")).toEqual({ ok: false, error: "fout" });
    // Supabase zou na de gemaakte link toch "wacht een minuut" antwoorden.
    expect(m.signInWithOtp).not.toHaveBeenCalled();
  });

  it("zonder sleutel van Resend stuurt Supabase de link", async () => {
    delete process.env.RESEND_API_KEY;
    expect(await sendLoginLink("bram@voorbeeld.be")).toEqual({ ok: true });
    expect(m.createUser).toHaveBeenCalled();
    expect(m.generateLink).not.toHaveBeenCalled();
    expect(m.signInWithOtp).toHaveBeenCalledWith({
      email: "bram@voorbeeld.be",
      options: { shouldCreateUser: false, emailRedirectTo: "https://adsweet.test/auth/callback?next=%2Fvandaag" },
    });
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

  it("inloggen met Facebook bewaart de sleutel van Meta, zodat dat account de cijfers levert", async () => {
    m.exchangeCodeForSession.mockResolvedValue({ data: { user: { id: "u9" }, session: { provider_token: "fb-kort" } }, error: null });
    expect(await completeLogin(new URLSearchParams("code=c0de&next=%2Fonboarding%2Fstart"))).toEqual({ ok: true, next: "/onboarding/start" });
    expect(m.saveUserMetaToken).toHaveBeenCalledWith("u9", "fb-kort");

    // Met een e-mail (code van Supabase, geen Facebook) is er niets te bewaren.
    m.saveUserMetaToken.mockClear();
    m.exchangeCodeForSession.mockResolvedValue({ data: { user: { id: "u9" }, session: { provider_token: null } }, error: null });
    await completeLogin(new URLSearchParams("code=c0de"));
    expect(m.saveUserMetaToken).not.toHaveBeenCalled();
  });

  it("Doorgaan met Facebook vraagt de rechten voor de advertentieaccounts, of de configuratie", async () => {
    m.signInWithOAuth.mockResolvedValue({ data: { url: "https://voorbeeld.supabase.co/auth/v1/authorize?provider=facebook" }, error: null });
    await facebookSignInUrl("/vandaag");
    expect(m.signInWithOAuth.mock.calls[0][0].options.scopes.split(" ")).toEqual(expect.arrayContaining(["email", "ads_read", "business_management"]));
    expect(m.signInWithOAuth.mock.calls[0][0].options.queryParams).toBeUndefined();
    process.env.META_LOGIN_CONFIG_ID = "cfg-9";
    await facebookSignInUrl("/vandaag");
    expect(m.signInWithOAuth.mock.calls[1][0].options.queryParams).toEqual({ config_id: "cfg-9" });
    delete process.env.META_LOGIN_CONFIG_ID;
  });
});
