import express from 'express'
import { authController } from '~/controllers/authController'
import { userController } from '~/controllers/userController'
// import { checkUserPermission } from '~/middlewares/checkUserPermission'
import { verifyToken } from '~/middlewares/verifyToken'

const router = express.Router()

router.post('/login', authController.logIn)
router.post('/sign-up', authController.signUp)
router.post('/logout', authController.logout)

router.use(verifyToken)
router.get('/parent', userController.getAllParents)
router.get('/read', userController.getAllUser)
router.get('/driver', userController.getAllDrivers)
router.get('/children', userController.getAllChildrens)

// chức năng phụ huynh đăng ký thông tin học sinh
router.get('/:id', userController.getDetailUser)

router.post('/register-student', userController.registerStudent)
// Route để phụ huynh sửa thông tin học sinh
router.put('/update-student/:studentId', userController.updateStudent)
// Route để thay đổi điểm đón/trả của học sinh
router.put('/stops/:studentId', userController.updateStudentStops)

router.put('/update-user/:userId', userController.updateUser)
router.put('/update-status-user', userController.updateStatusUser)
router.delete('/delete-student/:studentId', userController.deleteStudent)

// router.use(verifyToken,

router.delete('/delete-user/:userId', userController.deleteUser)

export const userRoute = router
