import express from 'express'
import { busController } from '~/controllers/busController'
import { checkUserPermission } from '~/middlewares/checkUserPermission'
import { verifyToken } from '~/middlewares/verifyToken'

const router = express.Router()

router.use(verifyToken)
// chức năng xem tất cả các route
router.get('/bus-route', busController.getAllBusRoutes)
// chức năng xem danh sách điểm đón/trả học sinh
router.get('/bus-route/:routeId/stops', busController.getBusRouteStops)
// chức năng xem chi tiet lịch trình của tài xế
router.get('/detail/bus-route/:id', busController.getDetailBusRoute)
// chức năng phụ huynh đăng ký tuyến xe cho học sinh
router.post('/register-route', busController.registerRoute)
// chức năng phụ huynh hủy đăng ký tuyến xe
router.post('/unregister-route', busController.unRegisterRoute)
// chức năng xem danh sách lịch trình của tài xế
router.get('/driver/:driverId/assigned-route', busController.getAssignedBusRoute)

router.use(checkUserPermission('Admin'))
router.post('/create-route', busController.createBusRoute)
// chức năng chỉnh sửa thông tin tuyến xe
router.put('/bus-route/:routeId', busController.updateBusRoute)
// chức năng xóa tuyến xe
router.delete('/delete-bus-route/:routeId', busController.deleteBusRoute)

export const busRoute = router
