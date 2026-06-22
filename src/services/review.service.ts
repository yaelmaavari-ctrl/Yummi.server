import { Types } from 'mongoose';
import { Review, IReview } from '../models/review.model';
import { Order } from '../models/order.model';
import { ApiError } from '../utils/ApiError';
import { OrderStatus } from '../types';
import { UserRole } from '../types';

export interface CreateReviewInput {
  orderId: string;
  rating: number;
  comment?: string;
}

export interface PublicReview {
  id: string;
  orderId: string;
  customerId: string;
  rating: number;
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Shape of an order document as needed by review logic.
 * The full IOrder interface is a stub (Developer B); we cast lean results
 * to this local type to access the `customer` field once orders are populated.
 */
interface OrderForReview {
  _id: Types.ObjectId;
  status: OrderStatus;
  userId?: Types.ObjectId;
}

function toPublicReview(review: IReview): PublicReview {
  return {
    id: review._id.toString(),
    orderId: review.order.toString(),
    customerId: review.customer.toString(),
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
  };
}

async function create(customerId: string, input: CreateReviewInput): Promise<PublicReview> {
  const order = (await Order.findById(input.orderId).lean()) as OrderForReview | null;

  if (!order) {
    throw ApiError.notFound('Order not found');
  }

  if (order.status !== OrderStatus.COMPLETED) {
    throw ApiError.badRequest('Reviews can only be submitted for completed orders');
  }

  if (!order.userId || order.userId.toString() !== customerId) {
    throw ApiError.forbidden('You can only review your own orders');
  }

  const existing = await Review.findOne({ order: input.orderId });
  if (existing) {
    throw ApiError.conflict('A review for this order already exists');
  }

  const review = await Review.create({
    order: new Types.ObjectId(input.orderId),
    customer: new Types.ObjectId(customerId),
    rating: input.rating,
    comment: input.comment?.trim() || undefined,
  });

  return toPublicReview(review);
}

async function list(): Promise<PublicReview[]> {
  const reviews = await Review.find().sort({ createdAt: -1 });
  return reviews.map(toPublicReview);
}

async function getById(
  reviewId: string,
  requesterId: string,
  requesterRole: UserRole
): Promise<PublicReview> {
  const review = await Review.findById(reviewId);

  if (!review) {
    throw ApiError.notFound('Review not found');
  }

  if (requesterRole !== UserRole.ADMIN && review.customer.toString() !== requesterId) {
    throw ApiError.forbidden('You do not have permission to view this review');
  }

  return toPublicReview(review);
}

export const reviewService = {
  create,
  list,
  getById,
};
