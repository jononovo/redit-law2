import { db } from "@/server/db";
import { brandCategories, productCategories } from "@/shared/schema";
import { eq, desc, asc } from "drizzle-orm";
import type { IStorage } from "./types";

export interface CategoryObject {
  id: number;
  name: string;
  path: string;
  depth: number;
  primary: boolean;
}

type BrandCategoryMethods = Pick<IStorage,
  | "setBrandCategories"
  | "getBrandCategoryObjects"
>;

export const brandCategoryMethods: BrandCategoryMethods = {
  async setBrandCategories(
    brandId: number,
    categories: { categoryId: number; isPrimary: boolean }[],
  ): Promise<void> {
    await db.delete(brandCategories).where(eq(brandCategories.brandId, brandId));

    if (!categories.length) return;

    await db.insert(brandCategories).values(
      categories.map((c) => ({
        brandId,
        categoryId: c.categoryId,
        isPrimary: c.isPrimary,
      })),
    );
  },

  async getBrandCategoryObjects(brandId: number): Promise<CategoryObject[]> {
    const rows = await db
      .select({
        id: productCategories.id,
        name: productCategories.name,
        path: productCategories.path,
        depth: productCategories.depth,
        isPrimary: brandCategories.isPrimary,
      })
      .from(brandCategories)
      .innerJoin(productCategories, eq(brandCategories.categoryId, productCategories.id))
      .where(eq(brandCategories.brandId, brandId))
      .orderBy(desc(brandCategories.isPrimary), asc(productCategories.id));

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      path: r.path,
      depth: r.depth,
      primary: r.isPrimary,
    }));
  },
};
