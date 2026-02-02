"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Trash2, Plus, Loader2, FolderKanban, RefreshCw } from "lucide-react";
import { useCategories } from "@/hooks/use-categories";
import { useUser, useFirestore } from "@/firebase";
import { 
  createCategory, 
  updateCategory, 
  deleteCategory, 
  isCategoryInUse, 
  reassignPurchaseCategory,
  ensureDefaultCategories
} from "@/lib/db/categories";
import { getCategoryIcon, getIconByName } from "@/lib/category-icons";
import { toast } from "@/lib/toast";
import type { Category } from "@/lib/types";

const PROTECTED_CATEGORY = "Other";

const AVAILABLE_ICONS = [
  { name: "UtensilsCrossed", label: "Food" },
  { name: "Plane", label: "Travel" },
  { name: "Cpu", label: "Electronics & PCBs" },
  { name: "Hammer", label: "Hardware & Materials" },
  { name: "Printer", label: "3D Printing" },
  { name: "Building2", label: "Lab Operations" },
  { name: "Wrench", label: "Tools & Equipment" },
  { name: "Code", label: "Software & Subscriptions" },
  { name: "Truck", label: "Logistics" },
  { name: "FileText", label: "Office Supplies" },
  { name: "PackageOpen", label: "Other" },
];

export function CategoryManagement() {
  const { categories, isLoading } = useCategories();
  const { user } = useUser();
  const firestore = useFirestore();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState("PackageOpen");

  const handleSyncCategories = async () => {
    if (!user || !firestore) {
      toast.error("Error", "User not authenticated");
      return;
    }

    setIsSyncing(true);
    try {
      console.log(`[CategoryManagement] Starting manual category sync for user ${user.uid}`);
      await ensureDefaultCategories(firestore, user.uid);
      toast.success("Categories Synced", "All default categories have been added to your account");
    } catch (error) {
      console.error("Error syncing categories:", error);
      toast.error("Sync Failed", "Failed to sync categories. Please try again or contact support.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddCategory = async () => {
    if (!user || !firestore || !newCategoryName.trim()) {
      toast.error("Error", "Please enter a category name");
      return;
    }

    setIsProcessing(true);
    try {
      await createCategory(firestore, user.uid, {
        name: newCategoryName.trim(),
        icon: newCategoryIcon,
        isDefault: false,
      });
      toast.success("Success", "Category created successfully");
      setIsAddDialogOpen(false);
      setNewCategoryName("");
      setNewCategoryIcon("PackageOpen");
    } catch (error) {
      console.error("Error creating category:", error);
      toast.error("Error", "Failed to create category");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditCategory = async () => {
    if (!user || !firestore || !selectedCategory || !newCategoryName.trim()) {
      return;
    }

    setIsProcessing(true);
    try {
      await updateCategory(firestore, user.uid, selectedCategory.id, {
        name: newCategoryName.trim(),
        icon: newCategoryIcon,
      });
      toast.success("Success", "Category updated successfully");
      setIsEditDialogOpen(false);
      setSelectedCategory(null);
      setNewCategoryName("");
      setNewCategoryIcon("PackageOpen");
    } catch (error) {
      console.error("Error updating category:", error);
      toast.error("Error", "Failed to update category");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteCategory = async (reassign: boolean) => {
    if (!user || !firestore || !selectedCategory) {
      return;
    }

    setIsProcessing(true);
    try {
      const inUse = await isCategoryInUse(firestore, user.uid, selectedCategory.name);
      
      if (inUse && reassign) {
        // Reassign to "Other" category
        await reassignPurchaseCategory(firestore, user.uid, selectedCategory.name, "Other");
      }

      await deleteCategory(firestore, user.uid, selectedCategory.id);
      toast.success("Success", "Category deleted successfully");
      setIsDeleteDialogOpen(false);
      setSelectedCategory(null);
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error("Error", "Failed to delete category");
    } finally {
      setIsProcessing(false);
    }
  };

  const openEditDialog = (category: Category) => {
    setSelectedCategory(category);
    setNewCategoryName(category.name);
    setNewCategoryIcon(category.icon);
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = async (category: Category) => {
    if (category.name === PROTECTED_CATEGORY) {
      toast.error("Error", `Cannot delete the '${PROTECTED_CATEGORY}' category`);
      return;
    }
    setSelectedCategory(category);
    setIsDeleteDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Card className="bg-slate-950/50 backdrop-blur-xl border-white/10 shadow-2xl">
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-slate-950/50 backdrop-blur-xl border-white/10 shadow-2xl animate-slide-in-right">
        <CardHeader>
          <CardTitle className="font-headline text-xl flex items-center gap-2">
            <FolderKanban className="h-5 w-5" />
            Category Management
          </CardTitle>
          <CardDescription>
            Manage expense categories for your hardware startup
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                onClick={() => setIsAddDialogOpen(true)}
                className="flex-1"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Category
              </Button>
              <Button
                onClick={handleSyncCategories}
                variant="outline"
                disabled={isSyncing}
                className="flex-shrink-0"
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Sync Defaults
                  </>
                )}
              </Button>
            </div>

            <div className="space-y-2">
              {categories.map((category) => {
                const Icon = getCategoryIcon(category.name);
                return (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-primary" />
                      <span className="font-medium">{category.name}</span>
                      {category.isDefault && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          Default
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(category)}
                        className="h-8 w-8"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDeleteDialog(category)}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        disabled={category.name === PROTECTED_CATEGORY}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Category Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
            <DialogDescription>
              Create a custom category for your expenses
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">Category Name</Label>
              <Input
                id="category-name"
                placeholder="e.g., Prototyping Materials"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-icon">Icon</Label>
              <Select value={newCategoryIcon} onValueChange={setNewCategoryIcon}>
                <SelectTrigger id="category-icon">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_ICONS.map((icon) => {
                    const Icon = getIconByName(icon.name);
                    return (
                      <SelectItem key={icon.name} value={icon.name}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <span>{icon.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                setNewCategoryName("");
                setNewCategoryIcon("PackageOpen");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAddCategory} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>
              Update the category name or icon
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-category-name">Category Name</Label>
              <Input
                id="edit-category-name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-category-icon">Icon</Label>
              <Select value={newCategoryIcon} onValueChange={setNewCategoryIcon}>
                <SelectTrigger id="edit-category-icon">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_ICONS.map((icon) => {
                    const Icon = getIconByName(icon.name);
                    return (
                      <SelectItem key={icon.name} value={icon.name}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <span>{icon.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setSelectedCategory(null);
                setNewCategoryName("");
                setNewCategoryIcon("PackageOpen");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleEditCategory} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Category Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedCategory?.name}"? This action cannot be undone.
              {selectedCategory && (
                <span className="block mt-2 text-yellow-500">
                  Any expenses in this category will be moved to "Other".
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedCategory(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDeleteCategory(true)}
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
