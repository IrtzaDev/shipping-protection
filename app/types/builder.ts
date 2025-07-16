export interface PageBuilder {
  id: string;
  name: string;
  deposit_price: number;
  main_categories: MainCategory[];
}

export interface MainCategory {
  id: string;
  title: string;
  short_detail: string;
  sub_categories: SubCategory[];
}

export interface SubCategory {
  id: string;
  title: string;
  price: number;
  is_active: boolean;
  image_url: string;
  option_text: string;
  options: Option[];
}

export interface Option {
  id: string;
  name: string;
  value: string;
  price?: number;
}

export interface BuilderConfig {
  mainCategory: MainCategory;
  subCategory: SubCategory;
  selectedOptions: Record<string, Option>;
  totalPrice: number;
  depositAmount: number;
} 