import { Types } from 'mongoose';
import { Review, IReview } from '../models/review.model';
import { Order } from '../models/order.model';
import { ApiError } from '../utils/ApiError';
import { OrderStatus, UserRole } from '../types';

export interface CreateReviewInput {
  orderId: string;
  rating: number;
  comment?: string;
}

export interface PublicReview {
  id: string;
  orderId: string;
  customerId: string;
  customerName: string;
  rating: number;
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface OrderForReview {
  _id: Types.ObjectId;
  status: OrderStatus;
  userId?: Types.ObjectId;
}

interface PopulatedCustomer {
  _id: Types.ObjectId;
  fullName: string;
}

type ReviewDocument = IReview & {
  customer: PopulatedCustomer | Types.ObjectId;
};

function resolveCustomerName(customer: PopulatedCustomer | Types.ObjectId): string {
  if (customer instanceof Types.ObjectId) {
    return 'Customer';
  }
  return customer.fullName;
}

function resolveCustomerId(customer: PopulatedCustomer | Types.ObjectId): string {
  if (customer instanceof Types.ObjectId) {
    return customer.toString();
  }
  return customer._id.toString();
}

function toPublicReview(review: ReviewDocument): PublicReview {
  return {
    id: review._id.toString(),
    orderId: review.order.toString(),
    customerId: resolveCustomerId(review.customer),
    customerName: resolveCustomerName(review.customer),
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

  const populated = (await Review.findById(review._id)
    .populate('customer', 'fullName')
    .lean()) as ReviewDocument | null;

  return toPublicReview(populated ?? (review as ReviewDocument));
}

async function list(): Promise<PublicReview[]> {
  const reviews = await Review.find()
    .populate('customer', 'fullName')
    .sort({ createdAt: -1 });

  return reviews.map((review) => toPublicReview(review as ReviewDocument));
}

async function getById(
  reviewId: string,
  requesterId: string,
  requesterRole: UserRole
): Promise<PublicReview> {
  const review = (await Review.findById(reviewId).populate(
    'customer',
    'fullName'
  )) as ReviewDocument | null;

  if (!review) {
    throw ApiError.notFound('Review not found');
  }

  if (
    requesterRole !== UserRole.ADMIN &&
    requesterRole !== UserRole.KITCHEN &&
    review.customer.toString() !== requesterId
  ) {
    throw ApiError.forbidden('You do not have permission to view this review');
  }

  return toPublicReview(review);
}

async function remove(reviewId: string): Promise<void> {
  const review = await Review.findByIdAndDelete(reviewId);

  if (!review) {
    throw ApiError.notFound('Review not found');
  }
}

export const reviewService = {
  create,
  list,
  getById,
  remove,
};
