import { requireUserPage } from "@/lib/auth/guards";
import { AccountNav } from "./account-nav";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUserPage("/conta");
  return (
    <div className="container-pb pt-10">
      <div className="mb-8">
        <p className="eyebrow mb-2">Minha conta</p>
        <h1 className="heading-lg">Olá, {user.name.split(" ")[0]}</h1>
      </div>
      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <AccountNav isAdmin={user.role === "ADMIN"} />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
