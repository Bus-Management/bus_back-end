import express from 'express'
import { busRouteController } from '~/controllers/busRouteController'
import { checkUserPermission } from '~/middlewares/checkUserPermission'
import { verifyToken } from '~/middlewares/verifyToken'

const router = express.Router()

router.use(verifyToken)
// chức năng xem tất cả các route
router.get('/', busRouteController.getAllBusRoutes)
router.get('/route-completed', busRouteController.getAllBusRoutesNoComplete)
router.get('/assigned-student', busRouteController.getBusRoutesAssigned)
// chức năng xem danh sách điểm đón/trả học sinh
router.get('/bus-route/:routeId/stops', busRouteController.getBusRouteStops)
// chức năng xem chi tiet lịch trình của tài xế
router.get('/detail/:id', busRouteController.getDetailBusRoute)
// chức năng phụ huynh đăng ký tuyến xe cho học sinh
router.post('/register-route', busRouteController.registerRoute)
// chức năng phụ huynh hủy đăng ký tuyến xe
router.post('/unregister-route', busRouteController.unRegisterRoute)
// chức năng xem danh sách lịch trình của tài xế
router.get('/driver/:driverId/assigned-route', busRouteController.getAssignedBusRoute)
router.get('/driver-completed/:driverId', busRouteController.getBusRouteDriverCompleted)

router.put('/update-route-status', busRouteController.updateRouteStatus)
router.put('/complete', busRouteController.updateCompleteRoute)

router.use(checkUserPermission('Admin'))
router.post('/create-route', busRouteController.createBusRoute)
// chức năng chỉnh sửa thông tin tuyến xe
router.put('/:routeId', busRouteController.updateBusRoute)
// chức năng xóa tuyến xe
router.delete('/delete-bus-route/:routeId', busRouteController.deleteBusRoute)

export const busRoute = router
