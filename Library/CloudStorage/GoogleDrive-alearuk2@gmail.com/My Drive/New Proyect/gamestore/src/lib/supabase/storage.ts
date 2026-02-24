import { createClient } from "./client";

const PRODUCT_IMAGES_BUCKET = "product-images";
const STORE_ASSETS_BUCKET = "store-assets";

/**
 * Upload a product image to Supabase Storage
 * @param file - File to upload
 * @param storeId - Store ID for folder organization
 * @param productId - Product ID for subfolder
 * @returns Public URL of the uploaded image
 */
export async function uploadProductImage(
    file: File,
    storeId: string,
    productId: string
): Promise<{ url: string; error: string | null }> {
    const supabase = createClient();

    const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${storeId}/${productId}/${fileName}`;

    const { error } = await supabase.storage
        .from(PRODUCT_IMAGES_BUCKET)
        .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
        });

    if (error) {
        console.error("Upload error:", error);
        return { url: "", error: error.message };
    }

    const { data: { publicUrl } } = supabase.storage
        .from(PRODUCT_IMAGES_BUCKET)
        .getPublicUrl(filePath);

    return { url: publicUrl, error: null };
}

/**
 * Upload a store asset (logo or banner) to Supabase Storage
 * @param file - File to upload
 * @param storeId - Store ID
 * @param type - Type of asset ("logo" | "banner")
 * @returns Public URL of the uploaded asset
 */
export async function uploadStoreAsset(
    file: File,
    storeId: string,
    type: "logo" | "banner"
): Promise<{ url: string; error: string | null }> {
    const supabase = createClient();

    const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const fileName = `${type}-${Date.now()}.${fileExt}`;
    const filePath = `${storeId}/${fileName}`;

    const { error } = await supabase.storage
        .from(STORE_ASSETS_BUCKET)
        .upload(filePath, file, {
            cacheControl: "3600",
            upsert: true, // Allow updating logo/banner
        });

    if (error) {
        console.error("Upload error:", error);
        return { url: "", error: error.message };
    }

    const { data: { publicUrl } } = supabase.storage
        .from(STORE_ASSETS_BUCKET)
        .getPublicUrl(filePath);

    return { url: publicUrl, error: null };
}

/**
 * Delete an image from product-images bucket
 * @param url - Full public URL of the image
 */
export async function deleteProductImage(url: string): Promise<{ error: string | null }> {
    const supabase = createClient();

    // Extract file path from URL
    const urlParts = url.split(`${PRODUCT_IMAGES_BUCKET}/`);
    if (urlParts.length < 2) {
        return { error: "Invalid URL format" };
    }

    const filePath = urlParts[1];

    const { error } = await supabase.storage
        .from(PRODUCT_IMAGES_BUCKET)
        .remove([filePath]);

    if (error) {
        console.error("Delete error:", error);
        return { error: error.message };
    }

    return { error: null };
}

/**
 * Get optimized image URL with transformations
 * @param url - Original public URL
 * @param options - Transform options
 */
export function getTransformedImageUrl(
    url: string,
    options: {
        width?: number;
        height?: number;
        quality?: number;
        format?: "webp" | "png" | "jpg";
    } = {}
): string {
    const { width = 400, height, quality = 80, format = "webp" } = options;

    // Supabase image transformation URL format
    const transformParams = new URLSearchParams({
        width: width.toString(),
        ...(height && { height: height.toString() }),
        quality: quality.toString(),
        format,
    });

    // Replace /storage/v1/object/public/ with /storage/v1/render/image/public/
    const transformedUrl = url.replace(
        "/storage/v1/object/public/",
        `/storage/v1/render/image/public/`
    );

    return `${transformedUrl}?${transformParams.toString()}`;
}
