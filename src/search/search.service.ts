import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Guardar una búsqueda en el historial
   */
  async saveSearch(searchTerm: string, resultsCount: number, userId?: string): Promise<void> {
    try {
      await this.prisma.searchHistory.create({
        data: {
          searchTerm: searchTerm.trim().toLowerCase(),
          resultsCount,
          userId: userId || null,
        },
      });
    } catch (error) {
      // No fallar si no se puede guardar el historial
      this.logger.warn(`Error guardando búsqueda en historial: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Obtener historial de búsquedas de un usuario
   */
  async getUserSearchHistory(userId: string, limit: number = 10) {
    return this.prisma.searchHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        searchTerm: true,
        resultsCount: true,
        createdAt: true,
      },
    });
  }

  /**
   * Obtener búsquedas más populares (globales)
   */
  async getPopularSearches(limit: number = 10) {
    // Agrupar por término de búsqueda y contar ocurrencias
    const searches = await this.prisma.searchHistory.groupBy({
      by: ['searchTerm'],
      _count: {
        searchTerm: true,
      },
      orderBy: {
        _count: {
          searchTerm: 'desc',
        },
      },
      take: limit,
    });

    return searches.map((search) => ({
      term: search.searchTerm,
      count: search._count.searchTerm,
    }));
  }

  /**
   * Obtener sugerencias de búsqueda basadas en historial
   */
  async getSearchSuggestions(partialTerm: string, limit: number = 5) {
    if (!partialTerm || partialTerm.length < 2) {
      return [];
    }

    const term = partialTerm.trim().toLowerCase();

    // Buscar términos que empiecen con el término parcial
    const suggestions = await this.prisma.searchHistory.findMany({
      where: {
        searchTerm: {
          startsWith: term,
        },
      },
      select: {
        searchTerm: true,
      },
      distinct: ['searchTerm'],
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    return suggestions.map((s) => s.searchTerm);
  }

  /**
   * Limpiar historial antiguo (más de X días)
   */
  async cleanOldHistory(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.prisma.searchHistory.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    this.logger.log(`Limpiados ${result.count} registros de historial de búsqueda`);
    return result.count;
  }
}
