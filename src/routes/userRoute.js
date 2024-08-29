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

// ------------------------------------Student
// chức năng phụ huynh đăng ký thông tin học sinh
router.post('/register-student', userController.registerStudent)
// Route để phụ huynh sửa thông tin học sinh
router.put('/update-student/:studentId', userController.updateStudent)

export const userRoute = router
