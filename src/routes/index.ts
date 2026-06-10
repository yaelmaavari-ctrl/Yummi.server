import { Router } from 'express';
import authRoutes from './auth.routes';
import categoryRoutes from './category.routes';
import productRoutes from './product.routes';
import ingredientRoutes from './ingredient.routes';
import deliveryZoneRoutes from './deliveryZone.routes';
import businessHoursRoutes from './businessHours.routes';
import reviewRoutes from './review.routes';
import cartRoutes from './cart.routes';
import orderRoutes from './order.routes';
import notificationRoutes from './notification.routes';
import statsRoutes from './stats.routes';

const router = Router();

// Developer A - Catalog & Configuration
router.use('/auth', authRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/ingredients', ingredientRoutes);
router.use('/delivery-zones', deliveryZoneRoutes);
router.use('/business-hours', businessHoursRoutes);
router.use('/reviews', reviewRoutes);

// Developer B - Ordering & Operations + Real-Time
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/notifications', notificationRoutes);
router.use('/stats', statsRoutes);

export default router;
