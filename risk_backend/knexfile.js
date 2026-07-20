import dotenv from 'dotenv';
dotenv.config();

export default {
  development: {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASS || '',
      database: process.env.DB_NAME || 'UKMH_RMS',
    },
    migrations: {
      directory: './migrations/knex',
      extension: 'js',
    },
    seeds: {
      directory: './seeds',
    },
  },
};
