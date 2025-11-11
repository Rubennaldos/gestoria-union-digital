import { useState, useEffect } from "react";
import { Module } from "@/types/auth";

const FAVORITES_KEY = "module_favorites";
const ORDER_KEY = "module_order";

export const useModulePreferences = (modules: Module[] = []) => {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [customOrder, setCustomOrder] = useState<string[]>([]);

  // Cargar preferencias del localStorage
  useEffect(() => {
    const savedFavorites = localStorage.getItem(FAVORITES_KEY);
    const savedOrder = localStorage.getItem(ORDER_KEY);

    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }

    if (savedOrder) {
      setCustomOrder(JSON.parse(savedOrder));
    } else {
      // Si no hay orden personalizado, usar el orden por defecto
      setCustomOrder((modules || []).map((m) => m.id));
    }
  }, [modules]);

  // Guardar favoritos
  const toggleFavorite = (moduleId: string) => {
    const newFavorites = favorites.includes(moduleId)
      ? favorites.filter(id => id !== moduleId)
      : [...favorites, moduleId];
    
    setFavorites(newFavorites);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
  };

  // Guardar orden personalizado
  const updateOrder = (newOrder: string[]) => {
    setCustomOrder(newOrder);
    localStorage.setItem(ORDER_KEY, JSON.stringify(newOrder));
  };

  // Obtener módulos ordenados
  const getOrderedModules = () => {
    if (customOrder.length === 0) return modules || [];

    return customOrder
      .map((id) => (modules || []).find((m) => m.id === id))
      .filter((m): m is Module => m !== undefined);
  };

  // Obtener módulos favoritos
  const getFavoriteModules = () => {
    return (modules || []).filter((m) => favorites.includes(m.id));
  };

  return {
    favorites,
    toggleFavorite,
    customOrder,
    updateOrder,
    getOrderedModules,
    getFavoriteModules,
  };
};
