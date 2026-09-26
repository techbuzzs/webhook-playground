import Link from "next/link";
import { AdminUsers } from "@/components/admin-users";

export default function AdminPage() {
  return (
    <main className="admin-page shell">
      <header className="admin-header">
        <div><span className="eyebrow">Internal</span><h1>User administration</h1></div>
        <Link className="button ghost small" href="/">Back to playground</Link>
      </header>
      <p className="admin-note">Admins can manage account status and entitlements, but cannot inspect users’ captured webhook content.</p>
      <AdminUsers />
    </main>
  );
}
