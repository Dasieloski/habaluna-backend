import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { multerOptions } from '../interceptors/file-upload.interceptor';

export function UploadFile(fieldName: string = 'file') {
  return applyDecorators(UseInterceptors(FileInterceptor(fieldName, multerOptions)));
}

export function UploadFiles(fieldName: string = 'files', maxCount: number = 10) {
  return applyDecorators(UseInterceptors(FilesInterceptor(fieldName, maxCount, multerOptions)));
}
