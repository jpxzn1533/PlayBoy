export const ADMIN_PERMISSIONS = {
  dashboard: "Visão geral",
  products: "Produtos",
  categories: "Categorias",
  orders: "Vendas e pedidos",
  support: "Atendimento e entrega de contas",
  customers: "Clientes",
  leads: "Leads",
  reviews: "Avaliações",
  coupons: "Cupons",
  settings: "Configurações da loja",
  admins: "Permissões administrativas",
  logs: "Registro de atividades",
} as const;

export type AdminPermission = keyof typeof ADMIN_PERMISSIONS;
export const ALL_PERMISSIONS = Object.keys(ADMIN_PERMISSIONS) as AdminPermission[];
export const SUPER = "*";

export function hasPermission(
  user: { role: string; permissions: string[] } | null | undefined,
  permission: AdminPermission,
) {
  if (!user || user.role !== "ADMIN") return false;
  return user.permissions.includes(SUPER) || user.permissions.includes(permission);
}
