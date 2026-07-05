import { TEST_DATABASE_URL } from './test-db.config';

process.env.DATABASE_URL = TEST_DATABASE_URL;
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '1h';
process.env.GEMINI_API_KEY = 'test-key';
process.env.GEMINI_MODEL = 'gemini-2.5-flash';
process.env.SMTP_HOST = '';
process.env.SMTP_PORT = '';
process.env.SMTP_USER = '';
process.env.SMTP_PASS = '';
process.env.PORT = '0';
