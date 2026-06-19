require('dotenv').config();

const isRailway = Boolean(
  process.env.RAILWAY_ENVIRONMENT_NAME || process.env.RAILWAY_SERVICE_ID
);
const isProduction = process.env.NODE_ENV === 'production' || isRailway;
const jwtSecret = process.env.JWT_SECRET || (isProduction ? null : 'clave_desarrollo_sima');

if (!jwtSecret) {
  throw new Error('JWT_SECRET es obligatorio en produccion');
}

const parseBoolean = (value, defaultValue = false) => {
  if (value === undefined) return defaultValue;
  return String(value).toLowerCase() === 'true';
};

const firstDefined = (...keys) => {
  for (const key of keys) {
    const value = process.env[key];
    if (value !== undefined && value !== '') {
      return value;
    }
  }
  return undefined;
};

const parseDatabaseUrl = (value) => {
  if (!value) return {};

  try {
    const url = new URL(value);

    return {
      host: url.hostname,
      port: url.port,
      name: url.pathname.replace(/^\//, ''),
      user: decodeURIComponent(url.username || ''),
      password: decodeURIComponent(url.password || ''),
    };
  } catch {
    return {};
  }
};

const databaseUrl = parseDatabaseUrl(
  firstDefined('DATABASE_URL', 'MYSQL_URL')
);

const databaseVariables = {
  host: firstDefined('DB_HOST', 'MYSQLHOST') || databaseUrl.host,
  port: firstDefined('DB_PORT', 'MYSQLPORT') || databaseUrl.port,
  name: firstDefined('DB_NAME', 'MYSQLDATABASE') || databaseUrl.name,
  user: firstDefined('DB_USER', 'MYSQLUSER') || databaseUrl.user,
  password: firstDefined('DB_PASSWORD', 'MYSQLPASSWORD') || databaseUrl.password,
};

if (isProduction) {
  const missingDatabaseVariables = [
    ['DB_HOST', 'MYSQLHOST', databaseVariables.host],
    ['DB_NAME', 'MYSQLDATABASE', databaseVariables.name],
    ['DB_USER', 'MYSQLUSER', databaseVariables.user],
    ['DB_PASSWORD', 'MYSQLPASSWORD', databaseVariables.password],
  ]
    .filter(([, , value]) => !value)
    .map(([dbKey, mysqlKey]) => `${dbKey}, ${mysqlKey}, DATABASE_URL o MYSQL_URL`);

  if (missingDatabaseVariables.length > 0) {
    throw new Error(
      `Variables de entorno obligatorias faltantes: ${missingDatabaseVariables.join(', ')}`
    );
  }
}

const database = {
  host: databaseVariables.host || '127.0.0.1',
  port: databaseVariables.port || 3306,
  name: databaseVariables.name || 'sigma_mvp',
  user: databaseVariables.user || 'root',
  password: databaseVariables.password || '9090',
};

module.exports = {
  NODE_ENV: process.env.NODE_ENV || (isRailway ? 'production' : 'development'),
  PORT: process.env.PORT || 3000,
  HOST: process.env.HOST || '0.0.0.0',
  DB_HOST: database.host,
  DB_PORT: database.port,
  DB_NAME: database.name,
  DB_USER: database.user,
  DB_PASSWORD: database.password,
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
