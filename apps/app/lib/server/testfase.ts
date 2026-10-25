import "server-only";
import { demoOverrides } from "./demo-state";

/** Testfase: nieuwe bedrijven komen op de wachtlijst. Aan met TESTFASE=true of in het demopaneel. */
export async function testfaseOn(): Promise<boolean> {
  if (process.env.TESTFASE === "true") return true;
  return (await demoOverrides()).state === "testfase";
}

/** Is er een betaalpartner (Stripe of Mollie, fase 13)? Zonder start de proefperiode zonder betaling. */
export const paymentsLive = () => !!process.env.STRIPE_SECRET_KEY || !!process.env.MOLLIE_API_KEY;
