import 'dotenv/config'
import {PrismaPg} from '@prisma/adapter-pg'
import {PrismaClient} from '../generated/prisma/client'
import logger from './logger.config'
const databaseUrl = process.env.DATABASE_URL

if(!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not set')
}

declare global {
  var prisma: PrismaClient | undefined
}


const createPrismaClient = () => {
  const envAllowsInsecure = process.env.NODE_ENV === 'development';
  const useSSL = process.env.DATABASE_SSL !== 'false' && !envAllowsInsecure || databaseUrl.includes('sslmode=require');
  if (!useSSL && !envAllowsInsecure) {
    logger.warn('Connecting to PostgreSQL without SSL. Set DATABASE_SSL=true to confirm.');
  }
  const adapter = useSSL
    ? new PrismaPg({
        connectionString: `${databaseUrl}${databaseUrl.includes('?') ? '&' : '?'}sslmode=require`,
      })
    : new PrismaPg({
        connectionString: databaseUrl,
      })

return new PrismaClient({
    adapter,
    log:process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']

})
}

export const prisma = global.prisma || createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma
}