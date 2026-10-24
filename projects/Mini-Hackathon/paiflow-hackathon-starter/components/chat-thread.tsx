"use client";
import { useEffect, useState } from "react";
import { mutateMarket, refreshMarket } from "@/lib/market/store";
import { useMarket } from "@/lib/market/react";

export function ChatThread(opts: {
  threadId: string;
  meId: string;
  otherName: string;
}) {
  const state = useMarket();
  const [draft, setDraft] = useState("");
  const [optimistic, setOptimistic] = useState<
    { id: string; body: string; sentAt: string }[]
  >([]);
  const [error, setError] = useState("");

  // Heartbeat poll; storage events already make most updates instant.
  useEffect(() => {
    const timer = setInterval(() => void refreshMarket(), 2000);
    return () => clearInterval(timer);
  }, []);

  const messages = [
    ...state.messages.filter((m) => m.threadId === opts.threadId),
    ...optimistic.filter(
      (o) =>
        !state.messages.some(
          (m) => m.threadId === opts.threadId && m.id === o.id,
        ),
    ).map((o) => ({
      id: o.id,
      threadId: opts.threadId,
      senderId: opts.meId,
      body: o.body,
      sentAt: o.sentAt,
    })),
  ].sort((a, b) => a.sentAt.localeCompare(b.sentAt) || a.id.localeCompare(b.id));

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setError("");
    const id = crypto.randomUUID();
    const sentAt = new Date().toISOString();
    setOptimistic((prev) => [...prev, { id, body, sentAt }]);
    setDraft("");
    try {
      await mutateMarket((s) => {
        if (!s.messages.some((m) => m.id === id))
          s.messages.push({
            id,
            threadId: opts.threadId,
            senderId: opts.meId,
            body,
            sentAt,
          });
      });
      setOptimistic((prev) => prev.filter((o) => o.id !== id));
    } catch (err) {
      setOptimistic((prev) => prev.filter((o) => o.id !== id));
      setError(err instanceof Error ? err.message : "Message could not be sent.");
    }
  }

  return (
    <section className="chat">
      <h3>Chat with {opts.otherName}</h3>
      <div className="chat-log" data-testid="chat-log">
        {messages.length === 0 && (
          <p>
            No messages yet. Open this shift in a second browser tab with a
            different profile to talk.
          </p>
        )}
        {messages.map((m) => (
          <p
            key={m.id}
            className={m.senderId === opts.meId ? "msg me" : "msg"}
          >
            <span className="msg-body">{m.body}</span>
          </p>
        ))}
      </div>
      <form onSubmit={send} className="chat-form">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Message…"
          maxLength={2000}
        />
        <button disabled={!draft.trim()}>Send</button>
      </form>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
