import { createClient } from 'redis'
import 'dotenv/config'

const client = createClient({ url: `redis://default:${process.env.REDIS_PW}@${process.env.REDIS_HOST}:19700` })
client.on('error', (err) => console.log('Redis Client Error', err))
client.connect()
export const redis = client
