"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useStore } from "@/lib/hooks/use-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  FolderOpen,
  Loader2,
} from "lucide-react";
import type { Category } from "@/lib/types";
import { toast } from "sonner";

export default function CategoriesPage() {
  const { store, loading: storeLoading } = useStore();
  const supabase = createClient();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!store) return;
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store]);

  async function fetchCategories() {
    if (!store) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("store_id", store.id)
      .order("position");

    if (error) {
      toast.error("Error cargando categorias");
    } else {
      setCategories(data || []);
    }
    setLoading(false);
  }

  function openCreate() {
    setEditingCategory(null);
    setName("");
    setDialogOpen(true);
  }

  function openEdit(category: Category) {
    setEditingCategory(category);
    setName(category.name);
    setDialogOpen(true);
  }

  function openDelete(category: Category) {
    setDeletingCategory(category);
    setDeleteDialogOpen(true);
  }

  function generateSlug(text: string) {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  async function handleSave() {
    if (!store || !name.trim()) return;
    setSaving(true);

    if (editingCategory) {
      // Update
      const { error } = await supabase
        .from("categories")
        .update({
          name: name.trim(),
          slug: generateSlug(name.trim()),
        })
        .eq("id", editingCategory.id);

      if (error) {
        toast.error("Error actualizando categoria");
      } else {
        toast.success("Categoria actualizada");
        setDialogOpen(false);
        fetchCategories();
      }
    } else {
      // Create
      const position = categories.length;
      const { error } = await supabase.from("categories").insert({
        store_id: store.id,
        name: name.trim(),
        slug: generateSlug(name.trim()),
        position,
      });

      if (error) {
        toast.error("Error creando categoria");
      } else {
        toast.success("Categoria creada");
        setDialogOpen(false);
        fetchCategories();
      }
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!deletingCategory) return;
    setDeleting(true);

    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", deletingCategory.id);

    if (error) {
      toast.error("Error eliminando categoria. Puede tener productos asociados.");
    } else {
      toast.success("Categoria eliminada");
      setDeleteDialogOpen(false);
      setDeletingCategory(null);
      fetchCategories();
    }
    setDeleting(false);
  }

  if (storeLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Categorias</h1>
          <p className="text-sm text-muted-foreground">
            Organiza tus productos en categorias
          </p>
        </div>
        <Button onClick={openCreate} className="gradient-gaming text-white">
          <Plus className="mr-2 h-4 w-4" />
          Nueva categoria
        </Button>
      </div>

      {/* Categories Table */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : categories.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border/50">
          <FolderOpen className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No tienes categorias aun
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={openCreate}
          >
            <Plus className="mr-2 h-4 w-4" />
            Crear primera categoria
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border border-border/50">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Posicion</TableHead>
                <TableHead className="w-24 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>
                    <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" />
                  </TableCell>
                  <TableCell className="font-medium">
                    {category.name}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {category.slug}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {category.position}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(category)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-400 hover:text-red-300"
                        onClick={() => openDelete(category)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Editar categoria" : "Nueva categoria"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="category-name">Nombre</Label>
              <Input
                id="category-name"
                placeholder="Ej: Nintendo Switch, PlayStation..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && name.trim()) handleSave();
                }}
                autoFocus
              />
              {name.trim() && (
                <p className="text-xs text-muted-foreground">
                  Slug: {generateSlug(name.trim())}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={!name.trim() || saving}
              className="gradient-gaming text-white"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingCategory ? "Guardar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar categoria</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Estas seguro que deseas eliminar{" "}
            <span className="font-medium text-foreground">
              {deletingCategory?.name}
            </span>
            ? Los productos asociados quedaran sin categoria.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
