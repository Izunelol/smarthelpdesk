import { execSync } from 'child_process';
import { TEST_DB_CONTAINER_NAME } from './test-db.config';

export default async function globalTeardown(): Promise<void> {
  try {
    execSync(`docker rm -f ${TEST_DB_CONTAINER_NAME}`, { stdio: 'ignore' });
  } catch {
    // ignore
  }
}
