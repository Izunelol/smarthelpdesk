import { execSync } from 'child_process';
import { DataSource } from 'typeorm';
import { User } from '../src/users/user.entity';
import { Category } from '../src/categories/category.entity';
import { Ticket } from '../src/tickets/ticket.entity';
import { Attendance } from '../src/attendances/attendance.entity';
import { Rating } from '../src/ratings/rating.entity';
import { KnowledgeArticle } from '../src/knowledge-base/knowledge-article.entity';
import {
  TEST_DATABASE_URL,
  TEST_DB_CONTAINER_NAME,
  TEST_DB_NAME,
  TEST_DB_PASSWORD,
  TEST_DB_PORT,
  TEST_DB_USER,
} from './test-db.config';

export default async function globalSetup(): Promise<void> {
  try {
    execSync(`docker rm -f ${TEST_DB_CONTAINER_NAME}`, { stdio: 'ignore' });
  } catch {
    // container não existia
  }

  execSync(
    `docker run -d --name ${TEST_DB_CONTAINER_NAME} ` +
      `-e POSTGRES_USER=${TEST_DB_USER} -e POSTGRES_PASSWORD=${TEST_DB_PASSWORD} ` +
      `-e POSTGRES_DB=${TEST_DB_NAME} -p ${TEST_DB_PORT}:5432 postgres:16-alpine`,
    { stdio: 'ignore' },
  );

  await waitForPostgres();

  const dataSource = new DataSource({
    type: 'postgres',
    url: TEST_DATABASE_URL,
    entities: [User, Category, Ticket, Attendance, Rating, KnowledgeArticle],
    migrations: [__dirname + '/../src/migrations/*{.ts,.js}'],
  });
  await dataSource.initialize();
  await dataSource.runMigrations();
  await dataSource.destroy();
}

async function waitForPostgres(): Promise<void> {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      execSync(
        `docker exec ${TEST_DB_CONTAINER_NAME} pg_isready -U ${TEST_DB_USER} -d ${TEST_DB_NAME}`,
        { stdio: 'ignore' },
      );
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw new Error('Banco de dados de teste não ficou pronto a tempo');
}
