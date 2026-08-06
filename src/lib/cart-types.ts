export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  priceCents: number;
  image: string;
  quantity: number;
};

export const CART_STORAGE_KEY = "badlands-bricks-cart";
