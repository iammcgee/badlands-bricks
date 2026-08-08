"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { UserAvatar } from "@/components/UserAvatar";

export function ProfileSettingsForm({
  initialName,
  initialEmail,
  initialImage,
}: {
  initialName: string;
  initialEmail: string;
  initialImage: string | null;
}) {
  const router = useRouter();
  const { update } = useSession();
  const [name, setName] = useState(initialName);
  const [password, setPassword] = useState("");
  const [preview, setPreview] = useState<string | null>(initialImage);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  function onAvatarChange(file: File | null) {
    setAvatarFile(file);
    setSaved(false);
    if (!file) {
      setPreview(initialImage);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaved(false);
    setLoading(true);

    try {
      const form = new FormData();
      form.set("name", name.trim());
      if (password) form.set("password", password);
      if (avatarFile) form.set("avatar", avatarFile);

      const response = await fetch("/api/profile", {
        method: "PATCH",
        body: form,
      });
      const data = (await response.json()) as {
        error?: string;
        user?: { name: string; image: string | null };
      };
      if (!response.ok) throw new Error(data.error || "Update failed");

      await update({
        name: data.user?.name ?? name.trim(),
        image: data.user?.image ?? null,
      });
      setPassword("");
      setAvatarFile(null);
      setPreview(data.user?.image ?? null);
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 max-w-lg space-y-6">
      <div className="flex items-center gap-4">
        <UserAvatar name={name} image={preview} size={72} />
        <label className="cursor-pointer border border-white/25 px-4 py-2 text-xs font-bold tracking-[0.14em] text-white transition hover:border-brand-orange hover:text-brand-orange">
          UPLOAD PHOTO
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(event) => onAvatarChange(event.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      <label className="block space-y-2">
        <span className="text-xs tracking-[0.14em] text-white/70">NAME</span>
        <input
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setSaved(false);
          }}
          required
          className="w-full border border-white/25 bg-neutral-900 px-4 py-3 text-white outline-none focus:border-brand-orange"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-xs tracking-[0.14em] text-white/70">EMAIL</span>
        <input
          value={initialEmail}
          disabled
          className="w-full border border-white/10 bg-neutral-950 px-4 py-3 text-white/50"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-xs tracking-[0.14em] text-white/70">
          NEW PASSWORD (OPTIONAL)
        </span>
        <input
          type="password"
          value={password}
          minLength={6}
          onChange={(event) => {
            setPassword(event.target.value);
            setSaved(false);
          }}
          placeholder="Leave blank to keep current password"
          className="w-full border border-white/25 bg-neutral-900 px-4 py-3 text-white outline-none placeholder:text-white/35 focus:border-brand-orange"
        />
      </label>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {saved ? <p className="text-sm text-brand-orange">Profile saved.</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="bg-brand-orange px-6 py-3 text-sm font-bold tracking-[0.14em] text-white disabled:opacity-60"
      >
        {loading ? "SAVING…" : "SAVE PROFILE"}
      </button>
    </form>
  );
}
