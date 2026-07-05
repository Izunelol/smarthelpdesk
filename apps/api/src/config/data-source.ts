import 'reflect-metadata';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { typeOrmOptions } from './typeorm.options';

config();

export default new DataSource(typeOrmOptions);
