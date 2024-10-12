import express from 'express'
import { userRoute } from './userRoute'
import { busRoute } from './busRoute'
import { bus } from './bus'

const router = express.Router()

router.use('/user', userRoute)
router.use('/bus', bus)
router.use('/bus-route', busRoute)

export const APIs = router
