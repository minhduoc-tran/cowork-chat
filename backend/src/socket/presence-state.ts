import type { TypingSignalPayload } from "../types/presence.types";

export const TYPING_IDLE_TIMEOUT_MS = 5000;

type ActiveConversationEntry = {
  conversationId: number | null;
  updatedAt: number;
};

type StartTypingInput = TypingSignalPayload & {
  userId: number;
  onExpire: (input: { conversationId: number; userId: number }) => void;
};

export class PresenceState {
  private readonly userSockets = new Map<number, Set<string>>();
  private readonly socketUsers = new Map<string, number>();
  private readonly socketActiveConversation = new Map<
    string,
    ActiveConversationEntry
  >();
  private readonly typingTimers = new Map<string, NodeJS.Timeout>();

  addSocket(userId: number, socketId: string) {
    const sockets = this.userSockets.get(userId) ?? new Set<string>();
    sockets.add(socketId);
    this.userSockets.set(userId, sockets);
    this.socketUsers.set(socketId, userId);
    this.socketActiveConversation.set(socketId, {
      conversationId: null,
      updatedAt: Date.now()
    });

    return { firstSocketForUser: sockets.size === 1 };
  }

  removeSocket(socketId: string) {
    const userId = this.socketUsers.get(socketId);
    const previous =
      this.socketActiveConversation.get(socketId)?.conversationId ?? null;

    if (userId === undefined) {
      return { userId: null, wentOffline: false, previousConversationId: null };
    }

    const sockets = this.userSockets.get(userId) ?? new Set<string>();
    sockets.delete(socketId);

    if (sockets.size === 0) {
      this.userSockets.delete(userId);
    } else {
      this.userSockets.set(userId, sockets);
    }

    this.socketUsers.delete(socketId);
    this.socketActiveConversation.delete(socketId);

    return {
      userId,
      wentOffline: sockets.size === 0,
      previousConversationId: previous
    };
  }

  setActiveConversation(
    socketId: string,
    conversationId: number | null,
    userId: number,
    updatedAt = Date.now()
  ) {
    let current = this.socketActiveConversation.get(socketId);

    if (!current) {
      // Automatically register the socket if it was missed due to race conditions
      this.addSocket(userId, socketId);
      current = this.socketActiveConversation.get(socketId);
    }

    const previousConversationId = current ? current.conversationId : null;

    this.socketActiveConversation.set(socketId, { conversationId, updatedAt });

    return {
      previousConversationId,
      nextConversationId: conversationId
    };
  }

  getEffectiveActiveConversation(userId: number) {
    const socketIds = this.userSockets.get(userId);

    if (!socketIds || socketIds.size === 0) {
      return null;
    }

    const activeEntries = [...socketIds]
      .map(socketId => this.socketActiveConversation.get(socketId))
      .filter((entry): entry is ActiveConversationEntry => Boolean(entry))
      .filter(entry => entry.conversationId !== null)
      .sort((a, b) => b.updatedAt - a.updatedAt);

    return activeEntries[0]?.conversationId ?? null;
  }

  startTyping(input: StartTypingInput) {
    const key = `${input.conversationId}:${input.userId}`;
    const previousTimer = this.typingTimers.get(key);

    if (previousTimer) {
      clearTimeout(previousTimer);
    }

    const timer = setTimeout(() => {
      this.typingTimers.delete(key);
      input.onExpire({
        conversationId: input.conversationId,
        userId: input.userId
      });
    }, TYPING_IDLE_TIMEOUT_MS);

    this.typingTimers.set(key, timer);
    return { key, wasAlreadyTyping: Boolean(previousTimer) };
  }

  stopTyping(conversationId: number, userId: number) {
    const key = `${conversationId}:${userId}`;
    const timer = this.typingTimers.get(key);

    if (!timer) {
      return false;
    }

    clearTimeout(timer);
    this.typingTimers.delete(key);
    return true;
  }

  reset() {
    this.typingTimers.forEach(timer => clearTimeout(timer));
    this.userSockets.clear();
    this.socketUsers.clear();
    this.socketActiveConversation.clear();
    this.typingTimers.clear();
  }
}

export const presenceState = new PresenceState();
