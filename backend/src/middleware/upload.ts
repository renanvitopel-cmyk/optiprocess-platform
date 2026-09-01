import multer from "multer";

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

const PDF_TYPES = ["application/pdf"];
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

function fileFilterFor(allowed: string[]) {
  return (_req: unknown, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Tipo de arquivo nao permitido: ${file.mimetype}`));
    }
  };
}

export const uploadPdf = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: fileFilterFor(PDF_TYPES),
});

export const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: fileFilterFor(IMAGE_TYPES),
});

export const uploadAny = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: fileFilterFor([...PDF_TYPES, ...IMAGE_TYPES]),
});
