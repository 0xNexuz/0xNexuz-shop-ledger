import { timingSafeEqual } from "node:crypto";

import { readDeployCredentialEnv } from "@agent-native/core/server";
import { defineEventHandler, getHeader, getRequestURL } from "h3";

import { runNightlyCloses } from "../lib/nightly.js";

const SWEEP_PATH = "/_agent-native/jobs/_process-sweep";

function isCron(authorization: string | undefined): boolean {
  // The deploy-level key Vercel Cron sends; the framework's sweep checks it the same way.
  const secret = readDeployCredentialEnv("CRON_SECRET");
  if (!secret || !authorization) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(authorization);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Rides on the framework's daily sweep, which Vercel's cron calls at 18:00 UTC
 * (7 pm Lagos) with CRON_SECRET: before the sweep runs, close the day for each
 * active shop. Any other request passes straight through.
 */
export default defineEventHandler(async (event) => {
  if (!getRequestURL(event).pathname.startsWith(SWEEP_PATH)) return;
  if (!isCron(getHeader(event, "authorization"))) return;
  const result = await runNightlyCloses().catch((error) => {
    console.error("[evening-close] nightly run failed", error);
    return null;
  });
  if (result) console.log(`[evening-close] closed ${result.closed} shop(s), ${result.failed} failed`);
});
