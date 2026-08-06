"use client";

import { FormEvent, useState } from "react";

export function ContactForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          message: formData.get("message"),
        }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(json.error || "Send failed");
      setStatus("done");
      setMessage("Message sent. We’ll get back to you soon.");
      form.reset();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Send failed");
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto mt-10 max-w-xl space-y-4">
      <label className="block space-y-2">
        <span className="text-xs tracking-[0.14em] text-white/70">NAME</span>
        <input
          name="name"
          required
          className="w-full border border-white/25 bg-neutral-900 px-4 py-3 text-white outline-none focus:border-brand-orange"
        />
      </label>
      <label className="block space-y-2">
        <span className="text-xs tracking-[0.14em] text-white/70">EMAIL</span>
        <input
          name="email"
          type="email"
          required
          className="w-full border border-white/25 bg-neutral-900 px-4 py-3 text-white outline-none focus:border-brand-orange"
        />
      </label>
      <label className="block space-y-2">
        <span className="text-xs tracking-[0.14em] text-white/70">MESSAGE</span>
        <textarea
          name="message"
          required
          rows={5}
          className="w-full border border-white/25 bg-neutral-900 px-4 py-3 text-white outline-none focus:border-brand-orange"
        />
      </label>

      {message && (
        <p
          className={`text-sm ${
            status === "error" ? "text-red-400" : "text-green-400"
          }`}
        >
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full bg-brand-orange px-6 py-4 text-sm font-bold tracking-[0.16em] text-white hover:bg-orange-500 disabled:opacity-60"
      >
        {status === "loading" ? "SENDING..." : "SEND MESSAGE"}
      </button>
    </form>
  );
}
