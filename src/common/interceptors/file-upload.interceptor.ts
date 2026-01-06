import * as multer from 'multer';

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos de imagen (jpg, jpeg, png, gif, webp)'));
  }
};

export const multerOptions = {
  // En Railway (y en general producción) no usamos disco local: subimos a Cloudinary desde memoria.
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter,
};
