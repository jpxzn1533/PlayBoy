import { ShieldAlert } from "lucide-react";
import { EmptyState } from "@/components/ui/misc";

export default function NoPermissionPage() {
  return (
    <EmptyState
      icon={<ShieldAlert className="h-5 w-5" />}
      title="Acesso restrito"
      description="Seu usuário não tem permissão para acessar esta área. Solicite acesso a um administrador."
      className="mt-10"
    />
  );
}
