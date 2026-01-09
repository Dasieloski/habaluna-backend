import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user search history' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of results (default: 10)' })
  async getUserHistory(@Request() req: any, @Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.searchService.getUserSearchHistory(req.user.id, limitNum);
  }

  @Get('popular')
  @ApiOperation({ summary: 'Get popular searches' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of results (default: 10)' })
  async getPopularSearches(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.searchService.getPopularSearches(limitNum);
  }

  @Get('suggestions')
  @ApiOperation({ summary: 'Get search suggestions based on history' })
  @ApiQuery({ name: 'term', required: true, description: 'Partial search term' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of suggestions (default: 5)' })
  async getSuggestions(@Query('term') term: string, @Query('limit') limit?: string) {
    try {
      if (!term || term.trim().length < 2) {
        return [];
      }
      const limitNum = limit ? parseInt(limit, 10) : 5;
      return await this.searchService.getSearchSuggestions(term, limitNum);
    } catch (error) {
      // Devolver array vacío en caso de error para no interrumpir la búsqueda
      return [];
    }
  }
}
