import "server-only";
import { demoOverrides } from "./demo-state";

/** Testfase: zolang Meta de app niet goedkeurde, kan alleen wie uitgenodigd is binnen. Aan met TESTFASE=true of in het demopaneel. */
export async function testfaseOn(): Promise<boolean> {
  if (process.env.TESTFASE === "true") return true;
  return (await demoOverrides()).state === "testfase";
}
