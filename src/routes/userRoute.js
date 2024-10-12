import express from 'express'
import { authController } from '~/controllers/authController'
import { userController } from '~/controllers/userController'
import { checkUserPermission } from '~/middlewares/checkUserPermission'
import { verifyToken } from '~/middlewares/verifyToken'

const router = express.Router()

router.post('/login', authController.logIn)
router.post('/sign-up', authController.signUp)
router.post('/logout', authController.logout)

router.use(verifyToken)
// chức năng phụ huynh đăng ký thông tin học sinh
router.post('/register-student', userController.registerStudent)
// Route để phụ huynh sửa thông tin học sinh
router.put('/update-student/:studentId', userController.updateStudent)
// Route để thay đổi điểm đón/trả của học sinh
router.put('/stops/:studentId', userController.updateStudentStops)
router.get('/student/:id', userController.getDetailUser)

router.get('/driver', userController.getAllDrivers)
router.get('/parent', userController.getAllParents)
router.put('/update-user/:userId', userController.updateUser)
router.get('/children', checkUserPermission('Tài xế', 'Phụ huynh'), userController.getAllChildrens)

router.get('/read', checkUserPermission('Admin'), userController.getAllUser)
router.delete('/delete-user/:userId', checkUserPermission('Admin', 'Phụ huynh'), userController.deleteUser)

export const userRoute = router
