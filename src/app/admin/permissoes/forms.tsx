"use client";

import { useActionState, useState } from "react";
import { grantAdminAction, updateAdminPermissionsAction } from "../_actions/settings";
import { Form, Checkbox, Field, FormMessage, Input, SubmitButton } from "@/components/ui/form";
import { ADMIN_PERMISSIONS, ALL_PERMISSIONS, SUPER } from "@/lib/permissions";
import type { ActionState } from "@/lib/validation";

function PermissionChecks({ initial, canGrantSuper }: { initial: string[]; canGrantSuper: boolean }) {
  const [isSuper, setSuper] = useState(initial.includes(SUPER));
  return (
    <div className="space-y-3">
      {canGrantSuper && (
        <Checkbox name="permissions" value={SUPER} checked={isSuper} onChange={(e) => setSuper(e.target.checked)} label={<span className="font-medium text-fg">Acesso total (super administrador)</span>} />
      )}
      {!isSuper && (
        <div className="grid gap-2 sm:grid-cols-2">
          {ALL_PERMISSIONS.map((p) => (
            <Checkbox key={p} name="permissions" value={p} defaultChecked={initial.includes(p)} label={ADMIN_PERMISSIONS[p]} />
          ))}
        </div>
      )}
    </div>
  );
}

export function PermissionsEditor({ userId, current, canGrantSuper }: { userId: string; current: string[]; canGrantSuper: boolean }) {
  const [state, action] = useActionState<ActionState, FormData>(updateAdminPermissionsAction, {});
  return (
    <Form action={action} className="space-y-3">
      <input type="hidden" name="userId" value={userId} />
      <PermissionChecks initial={current} canGrantSuper={canGrantSuper} />
      <FormMessage state={state} />
      <SubmitButton variant="outline" size="sm" pendingText="Salvando...">Salvar permissões</SubmitButton>
    </Form>
  );
}

export function GrantAdminForm({ canGrantSuper }: { canGrantSuper: boolean }) {
  const [state, action] = useActionState<ActionState, FormData>(grantAdminAction, {});
  return (
    <Form action={action} className="space-y-4" noValidate>
      <Field label="E-mail da conta" name="email" error={state.fieldErrors?.email}>
        <Input name="email" type="email" maxLength={160} invalid={!!state.fieldErrors?.email} />
      </Field>
      <PermissionChecks initial={["dashboard"]} canGrantSuper={canGrantSuper} />
      <FormMessage state={state} />
      <SubmitButton className="w-full" pendingText="Concedendo...">Conceder acesso</SubmitButton>
    </Form>
  );
}
