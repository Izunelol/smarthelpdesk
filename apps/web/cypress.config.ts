import { defineConfig } from 'cypress';
import { Client } from 'pg';

export default defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL ?? 'http://localhost:5173',
    supportFile: false,
    testIsolation: false,
    setupNodeEvents(on) {
      on('task', {
        async promoteUser({ email, role }: { email: string; role: string }) {
          const client = new Client({
            connectionString:
              process.env.CYPRESS_TEST_DATABASE_URL ??
              'postgresql://helpdesk:helpdesk@localhost:5433/smarthelpdesk',
          });
          await client.connect();
          try {
            await client.query('UPDATE users SET role = $1 WHERE email = $2', [role, email]);
          } finally {
            await client.end();
          }
          return null;
        },
      });
    },
  },
});
