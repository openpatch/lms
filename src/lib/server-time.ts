/**
 * The server's clock, as well as this browser can tell.
 *
 * Every point in time the server sends — when the countdown is over, when the
 * round started — is read from the server's clock, and a phone's clock is
 * routinely a few seconds off. Comparing the two directly made the countdown
 * jump straight to "Los!" on a device running ahead of the server. Server
 * messages carry the server's own "now", so the difference can be measured and
 * taken back out here.
 *
 * The time a message spends on the wire is counted as part of the difference,
 * which leaves this clock a few tens of milliseconds behind the server's — a
 * countdown is that much longer rather than shorter, which is the harmless way
 * round.
 */
let offset = 0;

/** Records how far this browser's clock is from the server's. */
export function noteServerTime(serverNow: number): void {
  if (Number.isFinite(serverNow)) offset = serverNow - Date.now();
}

/** `Date.now()`, translated to the server's clock. */
export function serverTime(): number {
  return Date.now() + offset;
}
