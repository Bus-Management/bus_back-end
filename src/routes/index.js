import express from 'express'
import { userRoute } from './userRoute'
import { busRoute } from './busRoute'

const router = express.Router()

router.use('/user', userRoute)
router.use('/bus', busRoute)

export const APIs = router
