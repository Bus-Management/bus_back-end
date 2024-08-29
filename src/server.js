import express from 'express'
import cors from 'cors'

import { APIs } from './routes'
import { corsOptions } from './config/cors'
import { redis } from './config/connectRedis'
import cookieParser from 'cookie-parser'

const app = express()

const hostname = 'localhost'
const port = 3232

redis

app.use(cors(corsOptions))
app.use(cookieParser())
app.use(express.json({ limit: '10kb' }))

app.use('/api', APIs)

app.listen(port, hostname, () => {
  console.log(`Hello, I am running at ${hostname}:${port}`)
})
