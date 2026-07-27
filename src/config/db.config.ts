import 'dotenv/config'
import {PrismaPg} from '@prisma/adapter-pg'
import {PrismaClient} from '../generated/prisma/client'
const databaseUrl = process.env.DATABASE_URL

if(!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not set')
}

declare global {
  var prisma: PrismaClient | undefined
}


const createPrismaClient = () => {
  const adapter = new PrismaPg({

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