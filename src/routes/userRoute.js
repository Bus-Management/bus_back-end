import express from 'express'
import { userController } from '~/controllers/userController'

const router = express.Router()

router.get('/read', userController.getAllUser)
router.post('/sign-up', userController.signUp)

router.get('/driver/:driverId/assigned-route', userController.getAssignedBusRoute)

router.post('/create-route', userController.createBusRoute)

export const userRoute = router
