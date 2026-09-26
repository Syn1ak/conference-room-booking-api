// Drops the end-to-end database, so each run starts from the migrations and the seeded catalog.
import { execFileSync } from 'node:child_process';

const database = 'ConferenceRoomBookingE2E';
const sql =
  `IF DB_ID('${database}') IS NOT NULL BEGIN ` +
  `ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]; END`;

execFileSync(
  'docker',
  [
    'exec',
    'conference-room-booking-sql',
    '/opt/mssql-tools18/bin/sqlcmd',
    '-S',
    'localhost',
    '-U',
    'sa',
    '-P',
    process.env.MSSQL_SA_PASSWORD,
    '-C',
    '-b',
    '-Q',
    sql,
  ],
  { stdio: 'inherit' },
);
