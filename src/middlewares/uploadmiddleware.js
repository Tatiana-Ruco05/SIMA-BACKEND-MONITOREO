const multer = require('multer');

/**
 * Almacenamiento en memoria: el archivo .xlsx nunca toca el disco
 * Se procesa directamente desde `req.file.buffer`
 */
const storage = multer.memoryStorage();

const fileFilter = (_req, file, cb) => {
  const MIME_PERMITIDOS = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel',                                           // .xls
  ];

  if (MIME_PERMITIDOS.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error('Formato de archivo no permitido. Solo se aceptan archivos .xlsx o .xls'),
      false,
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB máximo
  },
});

module.exports = upload;
