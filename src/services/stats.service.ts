import { Order } from '../models/order.model';
import { Review } from '../models/review.model';
import { OrderStatus } from '../types';

export interface MostSoldProduct {
  productId: string;
  name: string;
  totalQuantity: number;
}

export interface DashboardStats {
  totalOrders: number;
  monthlyRevenue: number;
  mostSoldProducts: MostSoldProduct[];
  averageRating: number;
  totalCancellations: number;
}

/**
 * Statistics service - business logic. Owner: Developer B (ADMIN only).
 * Aggregations over Order/Review for the admin dashboard.
 */
export const statsService = {
  /**
   * Aggregated dashboard figures: total orders, current-month revenue,
   * most-sold products, average review rating, and total cancellations.
   */
  async getDashboard(): Promise<DashboardStats> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [totalOrders, totalCancellations, revenueAgg, mostSoldAgg, ratingAgg] = await Promise.all(
      [
        Order.countDocuments(),
        Order.countDocuments({ status: OrderStatus.CANCELLED }),
        Order.aggregate<{ _id: null; total: number }>([
          {
            $match: {
              status: OrderStatus.COMPLETED,
              createdAt: { $gte: monthStart, $lt: monthEnd },
            },
          },
          { $group: { _id: null, total: { $sum: '$total' } } },
        ]),
        Order.aggregate<{ _id: unknown; name: string; totalQuantity: number }>([
          { $match: { status: { $ne: OrderStatus.CANCELLED } } },
          { $unwind: '$items' },
          {
            $group: {
              _id: '$items.productId',
              name: { $first: '$items.name' },
              totalQuantity: { $sum: '$items.quantity' },
            },
          },
          { $sort: { totalQuantity: -1 } },
          { $limit: 5 },
        ]),
        Review.aggregate<{ _id: null; average: number }>([
          { $group: { _id: null, average: { $avg: '$rating' } } },
        ]),
      ]
    );

    const monthlyRevenue = revenueAgg[0]?.total ?? 0;
    const averageRating = ratingAgg[0] ? parseFloat(ratingAgg[0].average.toFixed(2)) : 0;

    const mostSoldProducts: MostSoldProduct[] = mostSoldAgg.map((entry) => ({
      productId: String(entry._id),
      name: entry.name,
      totalQuantity: entry.totalQuantity,
    }));

    return {
      totalOrders,
      monthlyRevenue: parseFloat(monthlyRevenue.toFixed(2)),
      mostSoldProducts,
      averageRating,
      totalCancellations,
    };
  },
};
