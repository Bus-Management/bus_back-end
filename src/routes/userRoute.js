import express from 'express'
import { authController } from '~/controllers/authController'
import { userController } from '~/controllers/userController'
import { checkUserPermission } from '~/middlewares/checkUserPermission'
import { verifyToken } from '~/middlewares/verifyToken'

const router = express.Router()

router.post('/login', authController.logIn)
router.post('/sign-up', authController.signUp)

// router.use(verifyToken)
router.get('/read', userController.getAllUser)
router.post('/create-route', userController.createBusRoute)

// chức năng xem danh sách lịch trình của tài xế
router.get('/driver/:driverId/assigned-route', userController.getAssignedBusRoute)
// router.get('/driver/:driverId/assigned-route', checkUserPermission('Tài xế'), userController.getAssignedBusRoute)

// chức năng xem danh sách điểm đón/trả học sinh
router.get('/bus-route/:routeId/stops', userController.getBusRouteStops)

// chức năng xác nhận đón học sinh tại điểm dừng
router.post('/bus-route/:routeId/stop/confirm-pickup', userController.confirmStudentPickup)

// chức năng xác nhận trả học sinh tại điểm dừng
router.post('/bus-route/:routeId/stop/confirm-dropoff', userController.confirmStudentDropoff)

// ------------------------------------Student
// chức năng phụ huynh đăng ký thông tin học sinh
router.post('/register-student', userController.registerStudent)
// chức năng phụ huynh đăng ký tuyến đường cho học sinh
router.post('/register-route', userController.registerRoute)
// Route để phụ huynh sửa thông tin học sinh
router.put('/update-student/:studentId', userController.updateStudent)
// Route để thay đổi điểm đón/trả của học sinh
router.put('/stops/:studentId', userController.updateStudentStops)

export const userRoute = router
