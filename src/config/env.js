require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';
const jwtSecret = process.env.JWT_SECRET || (isProduction ? null : 'clave_desarrollo_sima');

if (!jwtSecret) {
  throw new Error('JWT_SECRET es obligatorio en produccion');
}

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 3000,
  DB_HOST: process.env.DB_HOST || '127.0.0.1',
  DB_PORT: process.env.DB_PORT || 3306,
  DB_NAME: process.env.DB_NAME || 'sigma_mvp',
  DB_USER: process.env.DB_USER || 'root',
  DB_PASSWORD: process.env.DB_PASSWORD || '9090',
  JWT_SECRET: jwtSecret,
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  SIMA_QR_TTL_SECONDS: Number(process.env.SIMA_QR_TTL_SECONDS || 120),
  SIMA_GEO_LATITUD_CENTRO_CTPI: Number(process.env.SIMA_GEO_LATITUD_CENTRO_CTPI || 2.4832482),
  SIMA_GEO_LONGITUD_CENTRO_CTPI: Number(process.env.SIMA_GEO_LONGITUD_CENTRO_CTPI || -76.56177339999999),
  SIMA_GEO_RADIO_PERMITIDO_METROS: Number(process.env.SIMA_GEO_RADIO_PERMITIDO_METROS || 200),
  SIMA_GEO_PRECISION_MAXIMA_METROS: Number(process.env.SIMA_GEO_PRECISION_MAXIMA_METROS || 80),
};
