import { assertEnv, env } from './config/env.js';
import { testDatabaseConnection } from './config/database.js';
import app from './app.js';

async function start() {
  try {
    assertEnv();
    await testDatabaseConnection();
    console.log('Conexión MySQL OK');

    const server = app.listen(env.port, () => {
      console.log(`Inventory Pro API escuchando en puerto ${env.port}`);
    });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(
          `El puerto ${env.port} ya está en uso. Cierra la otra instancia del backend o cambia PORT en .env.`
        );
      } else {
        console.error('Error del servidor:', error.message);
      }
      process.exit(1);
    });

    const shutdown = async (signal) => {
      console.log(`${signal} recibido. Cerrando servidor...`);
      server.close(() => process.exit(0));
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error('No se pudo iniciar el servidor:', error.message);
    process.exit(1);
  }
}

start();
