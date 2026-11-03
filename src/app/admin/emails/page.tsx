import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/auth/guards";
import { formatDateTime } from "@/lib/format";
import { firstParam } from "@/lib/utils";
import { AdminHeader, EmptyRow, Table, Td, Th } from "@/components/admin/ui";
import { Badge, Pagination } from "@/components/ui/misc";
import { EmailPreview } from "./email-preview";

export const metadata = { title: "E-mails enviados" };
const PER_PAGE = 25;

export default async function EmailsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdminPage("settings");
  const page = Math.max(1, Number(firstParam((await searchParams).page)) || 1);
  const [emails, total] = await Promise.all([
    prisma.emailMessage.findMany({ orderBy: { createdAt: "desc" }, skip: (page - 1) * PER_PAGE, take: PER_PAGE }),
    prisma.emailMessage.count(),
  ]);
  const smtp = !!process.env.SMTP_HOST;

  return (
    <div>
      <AdminHeader
        title="E-mails enviados"
        description={smtp ? "Registro de todos os e-mails transacionais enviados via SMTP." : "SMTP não configurado: os e-mails ficam registrados aqui (útil em desenvolvimento para abrir links de verificação e recuperação)."}
        back={{ href: "/admin/configuracoes", label: "Configurações" }}
      />
      <Table minWidth={760}>
        <thead><tr><Th>Data</Th><Th>Destinatário</Th><Th>Assunto</Th><Th>Status</Th><Th className="text-right">Conteúdo</Th></tr></thead>
        <tbody>
          {emails.length === 0 && <EmptyRow colSpan={5} text="Nenhum e-mail registrado." />}
          {emails.map((e) => (
            <tr key={e.id} className="hover:bg-white/[0.02]">
              <Td className="whitespace-nowrap text-muted">{formatDateTime(e.createdAt)}</Td>
              <Td>{e.to}</Td>
              <Td className="max-w-[320px] truncate">{e.subject}</Td>
              <Td><Badge tone={e.status === "sent" ? "success" : e.status === "failed" ? "danger" : "neutral"}>{e.status === "sent" ? "Enviado" : e.status === "failed" ? "Falhou" : "Registrado"}</Badge></Td>
              <Td className="text-right"><EmailPreview subject={e.subject} html={e.html} /></Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <div className="mt-6"><Pagination page={page} totalPages={Math.ceil(total / PER_PAGE)} basePath="/admin/emails" params={{}} /></div>
    </div>
  );
}
