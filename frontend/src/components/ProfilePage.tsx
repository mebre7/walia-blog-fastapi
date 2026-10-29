import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import {
  ApiError,
  deleteProfilePicture,
  deleteUserAccount,
  getCurrentUser,
  getMediaUrl,
  updateUserProfile,
  uploadProfilePicture,
} from "../lib/api";
import type { CurrentUser } from "../lib/api";
import { ConfirmDialog } from "./ConfirmDialog";

type ProfilePageProps = {
  token: string | null;
  onLogin: () => void;
  onProfileUpdated: (user: CurrentUser) => void;
  onAccountDeleted: () => void;
};

function getUserId(user: CurrentUser): number | null {
  return user.user_id ?? user.id ?? null;
}

export function ProfilePage({
  token,
  onLogin,
  onProfileUpdated,
  onAccountDeleted,
}: ProfilePageProps) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(Boolean(token));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmingAccountDelete, setConfirmingAccountDelete] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    getCurrentUser(token)
      .then((currentUser) => {
        setUser(currentUser);
        setUsername(currentUser.username);
        setEmail(currentUser.email);
        onProfileUpdated(currentUser);
      })
      .catch((cause) =>
        setError(cause instanceof ApiError ? cause.message : "Could not load your profile."),
      )
      .finally(() => setLoading(false));
  }, [token, onProfileUpdated]);

  function applyUser(updated: CurrentUser) {
    setUser(updated);
    setUsername(updated.username);
    setEmail(updated.email);
    onProfileUpdated(updated);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !user) return;
    const userId = getUserId(user);
    if (userId === null) {
      setError("The current-user response did not include an ID.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      applyUser(await updateUserProfile(userId, token, {
        username: username.trim(),
        email: email.trim(),
      }));
      setNotice("Profile updated.");
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not update your profile.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePictureChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !token || !user) return;
    const userId = getUserId(user);
    if (userId === null) {
      setError("The current-user response did not include an ID.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      applyUser(await uploadProfilePicture(userId, token, file));
      setNotice("Profile picture updated.");
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not upload your profile picture.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePictureDelete() {
    if (!token || !user) return;
    const userId = getUserId(user);
    if (userId === null) {
      setError("The current-user response did not include an ID.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      applyUser(await deleteProfilePicture(userId, token));
      setNotice("Profile picture removed.");
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not remove your profile picture.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!token || !user) return;
    const userId = getUserId(user);
    if (userId === null) {
      setError("The current-user response did not include an ID.");
      return;
    }
    setConfirmingAccountDelete(true);
  }

  async function confirmDeleteAccount() {
    if (!token || !user) return;
    const userId = getUserId(user);
    if (userId === null) {
      setError("The current-user response did not include an ID.");
      return;
    }
    setDeletingAccount(true);
    setError("");
    try {
      await deleteUserAccount(userId, token);
      setConfirmingAccountDelete(false);
      onAccountDeleted();
      window.location.assign("/");
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not delete your account.");
    } finally {
      setDeletingAccount(false);
    }
  }

  if (!token) {
    return (
      <main className="mx-auto max-w-xl px-6 py-24 text-center">
        <h1 className="font-display text-4xl">Your profile</h1>
        <p className="mt-4 text-[#a6a79e]">Log in to view and manage your profile.</p>
        <button onClick={onLogin} className="mt-7 rounded-full bg-[#d1a878] px-5 py-2 font-semibold text-[#151611]">Log in</button>
      </main>
    );
  }

  if (loading) return <main className="mx-auto max-w-2xl px-6 py-16 text-[#a6a79e]">Loading profile…</main>;
  if (!user) return <main className="mx-auto max-w-2xl px-6 py-16"><p role="alert" className="text-[#e8b0a4]">{error || "Could not load your profile."}</p></main>;

  return (
    <main className="mx-auto max-w-2xl px-6 py-12 lg:px-12">
      <div className="mb-8"><p className="mb-3 text-xs font-semibold uppercase tracking-[.2em] text-[#d1a878]">Account settings</p><h1 className="font-display text-5xl">Your Profile</h1></div>
      <form onSubmit={handleSave} className="space-y-5 rounded-2xl border border-[#30332c] bg-[#151713] p-6">
        <div className="flex items-center gap-4">
          <img src={getMediaUrl(user.image_path)} alt="Profile" className="size-16 rounded-full object-cover" />
          <div className="min-w-0">
            <p className="font-semibold">{user.username}</p>
            <p className="text-sm text-[#a6a79e]">User ID: {getUserId(user) ?? "missing"}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <label className="cursor-pointer rounded-full border border-[#45493f] px-3 py-1 text-xs hover:border-[#d1a878]">
                Change picture
                <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handlePictureChange} disabled={saving} className="sr-only" />
              </label>
              {user.image_file && <button type="button" onClick={handlePictureDelete} disabled={saving} className="rounded-full border border-[#7d4a40] px-3 py-1 text-xs text-[#e8b0a4] disabled:opacity-60">Remove picture</button>}
            </div>
          </div>
        </div>
        <label className="block text-sm">Username<input required maxLength={50} value={username} onChange={(event) => setUsername(event.target.value)} className="mt-2 w-full rounded-lg border border-[#45493f] bg-[#0c0d0b] px-3 py-2" /></label>
        <label className="block text-sm">Email<input required type="email" maxLength={120} value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-lg border border-[#45493f] bg-[#0c0d0b] px-3 py-2" /></label>
        {error && <p role="alert" className="text-sm text-[#e8b0a4]">{error}</p>}
        {notice && <p role="status" className="text-sm text-[#a8d6ad]">{notice}</p>}
        <div className="flex flex-wrap justify-between gap-3"><button disabled={saving} className="rounded-full bg-[#d1a878] px-5 py-2 font-semibold text-[#151611] disabled:opacity-60">{saving ? "Saving…" : "Save profile"}</button><button type="button" onClick={handleDelete} className="rounded-full border border-[#7d4a40] px-5 py-2 text-[#e8b0a4] hover:bg-[#2b1916]">Delete account</button></div>
      </form>
      {confirmingAccountDelete && (
        <ConfirmDialog
          title="Delete your account?"
          message="Your account and all your posts will be permanently deleted. This cannot be undone."
          confirmLabel="Delete account"
          busy={deletingAccount}
          onCancel={() => setConfirmingAccountDelete(false)}
          onConfirm={confirmDeleteAccount}
        />
      )}
    </main>
  );
}
