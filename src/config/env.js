require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';
const jwtSecret = process.env.JWT_SECRET || (isProduction ? null : 'clave_desarrollo_sima');

if (!jwtSecret) {
  throw new Error('JWT_SECRET es obligatorio en produccion');
}

const requiredProductionVariables = [
  'DB_HOST',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
];

if (isProduction) {
  const missingVariables = requiredProductionVariables.filter(
    (key) => !process.env[key]
  );

  if (missingVariables.length > 0) {
    throw new Error(
      `Variables de entorno obligatorias faltantes: ${missingVariables.join(', ')}`
    );
  }
}

const parseBoolean = (value, defaultValue = false) => {
  if (value === undefined) return defaultValue;
  return String(value).toLowerCase() === 'true';
};

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 3000,
  HOST: process.env.HOST || '0.0.0.0',
  DB_HOST: process.env.DB_HOST || '127.0.0.1',
  DB_PORT: process.env.DB_PORT || 3306,
  DB_NAME: process.env.DB_NAME || 'sigma_mvp',
  DB_USER: process.env.DB_USER || 'root',
  DB_PASSWORD: process.env.DB_PASSWORD || '9090',
  DB_SSL: parseBoolean(process.env.DB_SSL),
  DB_SSL_REJECT_UNAUTHORIZED: parseBoolean(
    process.env.DB_SSL_REJECT_UNAUTHORIZED,
    true
  ),
  UPLOAD_DIR: process.env.UPLOAD_DIR || 'uploads',
  JWT_SECRET: jwtSecret,
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  SIMA_QR_TTL_SECONDS: Number(process.env.SIMA_QR_TTL_SECONDS || 120),
  SIMA_GEO_LATITUD_CENTRO_CTPI: Number(process.env.SIMA_GEO_LATITUD_CENTRO_CTPI || 2.4832482),
  SIMA_GEO_LONGITUD_CENTRO_CTPI: Number(process.env.SIMA_GEO_LONGITUD_CENTRO_CTPI || -76.56177339999999),
  SIMA_GEO_RADIO_PERMITIDO_METROS: Number(process.env.SIMA_GEO_RADIO_PERMITIDO_METROS || 200),
  SIMA_GEO_PRECISION_MAXIMA_METROS: Number(process.env.SIMA_GEO_PRECISION_MAXIMA_METROS || 80),
};
