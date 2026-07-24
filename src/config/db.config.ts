import 'dotenv/config'
import {PrismaPg} from '@prisma/adapter-pg' 
import {PrismaClient} from '../generated/prisma/client'
const databaseUrl = process.env.DATABASE_URL

if(!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not set')
}

declare global {
  var prisma: PrismaPg | undefined
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
