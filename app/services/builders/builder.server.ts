import prisma from "~/db.server";
import type { PageBuilder, MainCategory } from "~/types/builder";

export class BuilderService {
  static async getBuilderById(id: string) {
    return prisma.pageBuilder.findUnique({
      where: { id },
      include: {
        main_categories: {
          include: {
            sub_categories: {
              include: {
                options: true
              }
            }
          }
        }
      }
    });
  }

  static async getBuilderCategories(builderId: string) {
    return prisma.mainCategory.findMany({
      where: { page_builder_id: builderId },
      include: {
        sub_categories: {
          include: {
            options: true
          }
        }
      },
      orderBy: { created_at: 'asc' }
    });
  }
} 