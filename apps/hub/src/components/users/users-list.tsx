import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Users, Shield, Plus, Pencil, KeyRound, AlertTriangle } from "lucide-react";
import { usersQueryOptions, updateUser, type User } from "@/api/users";
import { useAuthStore } from "@/lib/auth";
import { EmptyState } from "@/components/shared/empty-state";
import { PermissionBadges } from "@/components/users/permission-badges";
import { UserForm } from "@/components/users/user-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function isSystemUser(user: User): boolean {
  return user.slug === "system";
}

function RoleBadge({ user }: { user: User }) {
  if (isSystemUser(user)) {
    return (
      <Badge variant="secondary" className="gap-1">
        <Shield className="size-3" />
        Sistema
      </Badge>
    );
  }
  if (user.role === "sysadmin") {
    return (
      <Badge variant="outline" className="gap-1 bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/20">
        <Shield className="size-3" />
        Admin
      </Badge>
    );
  }
  return null;
}

function SSObadge() {
  return (
    <Badge variant="outline" className="gap-1 text-sky-700 dark:text-sky-400 border-sky-500/30 bg-sky-500/10">
      SSO
    </Badge>
  );
}

function BootstrapBanner({ currentUserSlug }: { currentUserSlug: string }) {
  const queryClient = useQueryClient();
  const { mutate: promote, isPending } = useMutation({
    mutationFn: () => updateUser(currentUserSlug, { role: "sysadmin" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Você agora é administrador. Modo bootstrap encerrado.");
    },
    onError: () => toast.error("Erro ao promover usuário."),
  });

  return (
    <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <div className="flex-1">
        <p className="font-medium text-amber-800 dark:text-amber-300">Modo bootstrap ativo</p>
        <p className="mt-0.5 text-amber-700 dark:text-amber-400/80">
          Todos os usuários têm acesso total. Marque-se como administrador para ativar o controle de acesso.
        </p>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="shrink-0 border-amber-500/40 text-amber-800 dark:text-amber-300 hover:bg-amber-500/20"
        disabled={isPending}
        onClick={() => promote()}
      >
        Tornar-me admin
      </Button>
    </div>
  );
}

function RoleToggle({ user }: { user: User }) {
  const queryClient = useQueryClient();
  const isSysadmin = user.role === "sysadmin";

  const { mutate: toggle, isPending } = useMutation({
    mutationFn: () => updateUser(user.slug, { role: isSysadmin ? null : "sysadmin" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(isSysadmin ? `${user.displayName} removido dos admins.` : `${user.displayName} promovido a admin.`);
    },
    onError: () => toast.error("Erro ao alterar papel do usuário."),
  });

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Switch
        checked={isSysadmin}
        disabled={isPending}
        onCheckedChange={() => toggle()}
        className="scale-75"
      />
      <span>Admin</span>
    </div>
  );
}

function UserCard({ user, onEdit, isSysuser }: { user: User; onEdit: () => void; isSysuser: boolean }) {
  const navigate = useNavigate();
  const isSystem = isSystemUser(user);

  return (
    <div className="rounded-lg border bg-card px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
          {getInitials(user.displayName)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium leading-tight">{user.displayName}</span>
            <code className="text-xs text-muted-foreground">{user.slug}</code>
            {user.sso && <SSObadge />}
            <RoleBadge user={user} />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {isSysuser && !isSystem && <RoleToggle user={user} />}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-foreground"
              onClick={onEdit}
              title="Editar usuário"
            >
              <Pencil className="size-4" />
            </Button>
            {!user.sso && (
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-foreground"
                onClick={() => navigate({ to: "/settings/users/$slug/password", params: { slug: user.slug } })}
                title="Trocar senha"
              >
                <KeyRound className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-2 ml-12 flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="text-sm text-muted-foreground">
          {user.email || <span className="opacity-40">sem email</span>}
        </span>
        <PermissionBadges permissions={user.permissions} />
        <span className="text-xs text-muted-foreground">
          Max: {user.permissions?.maxAgents === 0 ? "ilimitado" : (user.permissions?.maxAgents ?? "—")}
        </span>
      </div>
    </div>
  );
}

export function UsersList() {
  const { data: users, isLoading } = useQuery(usersQueryOptions());
  const navigate = useNavigate();
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | undefined>();
  const currentUser = useAuthStore((s) => s.user);

  const bootstrapMode = !!users && !users.some((u) => u.slug !== "system" && u.role === "sysadmin");
  const currentIsSysuser = currentUser?.role === "sysuser";

  function openCreate() {
    setEditingUser(undefined);
    setFormOpen(true);
  }

  function openEdit(user: User) {
    navigate({ to: "/settings/users/$slug", params: { slug: user.slug } });
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!users?.length) {
    return (
      <>
        <div className="mb-4 flex justify-end">
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1.5 size-4" />
            Novo usuário
          </Button>
        </div>
        <EmptyState
          icon={<Users />}
          title="Nenhum usuário"
          description="Usuários cadastrados aparecerao aqui."
        />
        <UserForm
          key="__create__"
          user={undefined}
          open={formOpen}
          onOpenChange={setFormOpen}
        />
      </>
    );
  }

  return (
    <>
      {bootstrapMode && currentUser && (
        <BootstrapBanner currentUserSlug={currentUser.id} />
      )}

      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1.5 size-4" />
          Novo usuário
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        {users.map((user) => (
          <UserCard
            key={user.slug}
            user={user}
            onEdit={() => openEdit(user)}
            isSysuser={currentIsSysuser}
          />
        ))}
      </div>

      <UserForm
        key={editingUser?.slug ?? "__create__"}
        user={editingUser}
        open={formOpen}
        onOpenChange={setFormOpen}
      />
    </>
  );
}
