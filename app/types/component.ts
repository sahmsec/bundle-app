/** Display shapes for a bundle's components, enriched with live product data. */

export interface ProductInfo {
  id: string;
  title: string;
  imageUrl: string | null;
  price: number | null;
  currencyCode: string | null;
  status: string | null;
  totalVariants: number | null;
}

export interface ComponentView {
  id: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  position: number;
  optional: boolean;
  /** null when the product was deleted in Shopify after being added. */
  product: ProductInfo | null;
}
