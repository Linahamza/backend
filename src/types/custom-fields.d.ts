//src\types\custom-fields.d.ts
import { CustomFields } from '@vendure/core';

declare module '@vendure/core' {
  interface CustomProductFields {
    packaging: string;
    matter: string;
    measure_Unit_For_Packaging: string;
    measure_Unit_For_PricePerUnit: string;
    parsing_Duration: number;
    brand_Id: number;
    brand_Name: string;
    origin_Id: number;
    origin_Country: string;
    market_Id: number;
    market_Name: string;
    market_Address: string;
    ean: string;
  }

  interface CustomProductVariantFields {
    availability: boolean;
    evolution_parsing_date: string;
    certification: string;
    format: string;
    ingredients: string;
    ingredients_clean: string;
    on_discount: boolean;
    price_per_packaging: number;
    price_per_unit: number;
    weight_per_packaging: number;
    carbohydrates: number;
    sugars: number;
    kcal: number;
    kj: number;
    fats: number;
    saturates: number;
    proteins: number;
    calcium: number;
    iodine: number;
    iron: number;
    salt: number;
    sodium: number;
    zinc: number;
    vitamin_a: number;
    vitamin_b1: number;
    vitamin_c: number;
    vitamin_d: number;
  }
}
