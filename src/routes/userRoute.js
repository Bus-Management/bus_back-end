import express from 'express'
import { userController } from '~/controllers/userController'

const router = express.Router()

router.get('/read', userController.getAllUser)
router.post('/sign-up', userController.signUp)

router.post('/create-route', userController.createBusRoute)

// chức năng xem danh sách lịch trình của tài xế
router.get('/driver/:driverId/assigned-route', userController.getAssignedBusRoute)

// chức năng xem danh sách điểm đón/trả học sinh
router.get('/bus-route/:routeId/stops', userController.getBusRouteStops)

// chức năng xác nhận đón học sinh tại điểm dừng
router.post('/bus-route/:routeId/stop/confirm-pickup', userController.confirmStudentPickup)

// chức năng xác nhận trả học sinh tại điểm dừng
router.post('/bus-route/:routeId/stop/confirm-dropoff', userController.confirmStudentDropoff)

export const userRoute = router
