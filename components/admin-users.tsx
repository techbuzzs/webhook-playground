"use client";

import { useState } from "react";
import type { Profile, Role, Tier } from "@/lib/types";

export function AdminUsers() {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<Profile[]>([]);
  const [message, setMessage] = useState("Search for a user to begin.");

  async function findUsers() {
    const response = await fetch(`/api/admin/users?search=${encodeURIComponent(search)}`);
    const body = await response.json();
    if (!response.ok) { setMessage(body.error ?? "Search failed"); return; }
    setUsers(body.users);
    setMessage(body.users.length ? "" : "No matching users.");
  }

  async function updateUser(id: string, update: { tier?: Tier; role?: Role; disabled?: boolean }) {
    const response = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: id, ...update }),
    });
    const body = await response.json();
    if (!response.ok) { setMessage(body.error ?? "Update failed"); return; }
    setUsers((current) => current.map((user) => user.id === id ? body.user : user));
    setMessage("User updated and audit event recorded.");
  }

  return (
    <section className="admin-card">
      <div className="admin-search">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Email, GitHub login, or user ID" />
        <button className="button primary small" onClick={() => void findUsers()}>Search users</button>
      </div>
      {message && <p className="admin-message">{message}</p>}
      {users.map((user) => (
        <article className="user-row" key={user.id}>
          <div><b>{user.github_login ?? user.email ?? "Unnamed user"}</b><small>{user.email}<br />{user.id}</small></div>
          <label>Tier
            <select value={user.tier} onChange={(event) => void updateUser(user.id, { tier: event.target.value as Tier })}>
              <option value="basic">Basic</option><option value="plus">Plus</option><option value="pro">Pro</option><option value="super_user">Super User</option>
            </select>
          </label>
          <label>Role
            <select value={user.role} onChange={(event) => void updateUser(user.id, { role: event.target.value as Role })}>
              <option value="user">User</option><option value="admin">Admin</option>
            </select>
          </label>
          <label className="check"><input type="checkbox" checked={user.disabled} onChange={(event) => void updateUser(user.id, { disabled: event.target.checked })} /> Disabled</label>
        </article>
      ))}
    </section>
  );
}
