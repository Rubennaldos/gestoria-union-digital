import { Plus, X } from "lucide-react";
import { Module } from "@/types/auth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ModuleCircle } from "@/components/ui/module-circle";
import { useState } from "react";
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";

interface QuickAccessSectionProps {
  modules: Module[];
  favorites: string[];
  onToggleFavorite: (moduleId: string) => void;
  onReorder: (newOrder: string[]) => void;
  moduleIcons: Record<string, any>;
  moduleColors: Record<string, "primary" | "warning" | "success" | "secondary">;
  moduleRoutes: Record<string, string>;
}

export const QuickAccessSection = ({
  modules,
  favorites,
  onToggleFavorite,
  onReorder,
  moduleIcons,
  moduleColors,
  moduleRoutes,
}: QuickAccessSectionProps) => {
  const [open, setOpen] = useState(false);
  const favoriteModules = modules.filter((m) => favorites.includes(m.id));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = favorites.indexOf(active.id as string);
      const newIndex = favorites.indexOf(over.id as string);

      const newFavorites = [...favorites];
      const [removed] = newFavorites.splice(oldIndex, 1);
      newFavorites.splice(newIndex, 0, removed);

      onReorder(newFavorites);
    }
  };

  return (
    <div className="bg-card border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">
          Accesos Rápidos
        </h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agregar Accesos Rápidos</DialogTitle>
              <DialogDescription>
                Selecciona los módulos que quieres tener en acceso rápido
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-3 gap-4 py-4 max-h-96 overflow-y-auto">
              {modules.map((module) => {
                const Icon = moduleIcons[module.id] || moduleIcons.padron;
                const isFavorite = favorites.includes(module.id);
                const color = moduleColors[module.id] || "primary";

                return (
                  <button
                    key={module.id}
                    onClick={() => {
                      onToggleFavorite(module.id);
                    }}
                    className="flex flex-col items-center gap-2 p-2 rounded-lg hover:bg-accent transition-colors relative"
                  >
                    {isFavorite && (
                      <div className="absolute -top-1 -right-1 bg-success rounded-full p-1">
                        <X className="h-3 w-3 text-white" />
                      </div>
                    )}
                    <div
                      className={`w-12 h-12 rounded-full border-2 flex items-center justify-center ${
                        isFavorite ? "bg-success/20 border-success" : "bg-muted border-muted-foreground/20"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-xs text-center line-clamp-2">
                      {module.nombre}
                    </span>
                  </button>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {favoriteModules.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground text-sm">
          <p>No hay accesos rápidos</p>
          <p className="text-xs mt-1">Presiona el + para agregar</p>
        </div>
      ) : (
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={favorites}
            strategy={horizontalListSortingStrategy}
          >
            <div className="flex flex-wrap gap-4 justify-start">
              {favoriteModules.map((module) => {
                const icon = moduleIcons[module.id] || moduleIcons.padron;
                const color = moduleColors[module.id] || "primary";
                const href = moduleRoutes[module.id] || `/${module.id}`;

                return (
                  <ModuleCircle
                    key={module.id}
                    id={module.id}
                    title={module.nombre}
                    icon={icon}
                    href={href}
                    color={color}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
};
