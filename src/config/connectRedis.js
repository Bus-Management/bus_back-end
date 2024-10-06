import { createClient } from 'redis'
import 'dotenv/config'

const client = createClient({ url: `redis://${process.env.REDIS_USERNAME}:${process.env.REDIS_PW}@${process.env.REDIS_HOST}` })
client.on('error', (err) => console.log('Redis Client Error', err))
client.connect()
export const redis = client
