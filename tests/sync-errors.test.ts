import { describe, expect, it } from "vitest";
import { isAuthError, SIGN_IN_EXPIRED_MESSAGE, syncErrorMessage } from "@/lib/aurea/sync";

describe("sync error reporting", () => {
  it("treats a 401 from the database as an expired sign-in", () => {
    expect(isAuthError({ status: 401, message: "Unauthorized" })).toBe(true);
    expect(isAuthError({ code: "PGRST303", message: "JWT expired" })).toBe(true);
    expect(isAuthError({ message: "Invalid Refresh Token: Refresh Token Not Found" })).toBe(true);
    expect(syncErrorMessage({ status: 401 })).toBe(SIGN_IN_EXPIRED_MESSAGE);
  });

  it("does not mistake other failures for an expired sign-in", () => {
    expect(isAuthError({ status: 400, code: "P0001", message: "This copy of Aurea is out of date. Reload the page to keep syncing." })).toBe(false);
    expect(isAuthError(new TypeError("Failed to fetch"))).toBe(false);
    expect(isAuthError(null)).toBe(false);
  });

  it("explains other failures in plain words", () => {
    expect(syncErrorMessage(new TypeError("Failed to fetch"))).toMatch(/couldn't reach the cloud/);
    expect(syncErrorMessage({ code: "P0001", message: "This copy of Aurea is out of date. Reload the page to keep syncing." })).toBe("Sync failed: This copy of Aurea is out of date. Reload the page to keep syncing.");
    expect(syncErrorMessage(undefined)).toMatch(/Sync failed/);
  });
});
