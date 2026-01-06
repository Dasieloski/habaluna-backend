import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UploadService } from './upload.service';
import { multerOptions } from '../common/interceptors/file-upload.interceptor';

@ApiTags('upload')
@Controller('upload')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('single')
  @UseInterceptors(FileInterceptor('file', multerOptions))
  @ApiOperation({ summary: 'Upload single image (Admin only)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async uploadSingle(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const uploaded = await this.uploadService.uploadImage(file);
    return {
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      url: uploaded.url,
      publicId: uploaded.publicId,
      bytes: uploaded.bytes,
      width: uploaded.width,
      height: uploaded.height,
      format: uploaded.format,
    };
  }

  @Post('multiple')
  @UseInterceptors(FilesInterceptor('files', 10, multerOptions))
  @ApiOperation({ summary: 'Upload multiple images (Admin only)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  async uploadMultiple(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    const results = await Promise.all(files.map((f) => this.uploadService.uploadImage(f)));
    return files.map((file, idx) => ({
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      url: results[idx].url,
      publicId: results[idx].publicId,
      bytes: results[idx].bytes,
      width: results[idx].width,
      height: results[idx].height,
      format: results[idx].format,
    }));
  }
}

