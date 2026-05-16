import { describe, expect, it } from "vitest";
import { getSocketServer } from "../../src/socket/socket.server";

describe("socket server access", () => {
  it("throws before initialization", () => {
    expect(() => getSocketServer()).toThrow("Socket server not initialized");
  });
});