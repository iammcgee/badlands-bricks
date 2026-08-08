"use client";

import { FormEvent, useState } from "react";

export function SubmitMocForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    const form = event.currentTarget;
    const data = new FormData(form);

    try {
      const response = await fetch("/api/submit-moc", {
        method: "POST",
        body: data,
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(json.error || "Submit failed");
      setStatus("done");
      setMessage("Thanks! Your MOC was submitted for review.");
      form.reset();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Submit failed");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" encType="multipart/form-data">
      <label className="block space-y-2">
        <span className="text-sm text-white">Your Name</span>
        <input
          name="builderName"
          required
          className="w-full border border-white/25 bg-neutral-900 px-4 py-3 text-white outline-none focus:border-brand-orange"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm text-white">Your Email</span>
        <input
          name="builderEmail"
          type="email"
          required
          className="w-full border border-white/25 bg-neutral-900 px-4 py-3 text-white outline-none focus:border-brand-orange"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm text-white">MOC Name</span>
        <input
          name="mocName"
          required
          className="w-full border border-white/25 bg-neutral-900 px-4 py-3 text-white outline-none focus:border-brand-orange"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm text-white">Theme</span>
        <input
          name="theme"
          required
          className="w-full border border-white/25 bg-neutral-900 px-4 py-3 text-white outline-none focus:border-brand-orange"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm text-white">Upload Your MOC Photos</span>
        <div className="border border-dashed border-white/40 px-4 py-8 text-center text-white/70">
          <input
            name="photos"
            type="file"
            accept="image/*"
            multiple
            required
            className="w-full text-sm"
          />
        </div>
      </label>

      <label className="block space-y-2">
        <span className="text-sm text-white">Upload Your Instruction Photos</span>
        <div className="border border-dashed border-white/40 px-4 py-8 text-center text-white/70">
          <input
            name="instructions"
            type="file"
            accept="image/*,.pdf"
            multiple
            required
            className="w-full text-sm"
          />
        </div>
      </label>

      <label className="block space-y-2">
        <span className="text-sm text-white">Notes (optional)</span>
        <textarea
          name="notes"
          rows={3}
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
        className="w-full border-2 border-brand-orange bg-black px-6 py-4 text-sm font-bold tracking-[0.16em] text-brand-orange transition hover:bg-brand-orange hover:text-white disabled:opacity-60"
      >
        {status === "loading" ? "SUBMITTING..." : "SUBMIT"}
      </button>
    </form>
  );
}
