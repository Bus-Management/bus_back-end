import express from 'express'
import { busController } from '~/controllers/busController'
import { checkUserPermission } from '~/middlewares/checkUserPermission'
import { verifyToken } from '~/middlewares/verifyToken'

const router = express.Router()

router.use(verifyToken)
router.get('', busController.getAllBus)
// // chức năng xem chi tiet lịch trình của tài xế
// router.get('/detail/bus-route/:id', busRouteController.getDetailBusRoute)
// // chức năng phụ huynh đăng ký tuyến xe cho học sinh
// router.post('/register-route', busRouteController.registerRoute)
// // chức năng phụ huynh hủy đăng ký tuyến xe
// router.post('/unregister-route', busRouteController.unRegisterRoute)
// // chức năng xem danh sách lịch trình của tài xế
// router.get('/driver/:driverId/assigned-route', busRouteController.getAssignedBusRoute)
router.get('/:id', busController.getDetailBus)

router.use(checkUserPermission('Admin'))
router.post('', busController.createBus)

// router.post('/create-route', busRouteController.createBusRoute)
// // chức năng chỉnh sửa thông tin tuyến xe
// router.put('/bus-route/:routeId', busRouteController.updateBusRoute)
// // chức năng xóa tuyến xe
router.delete('/:busId', busController.deleteBus)

export const bus = router
