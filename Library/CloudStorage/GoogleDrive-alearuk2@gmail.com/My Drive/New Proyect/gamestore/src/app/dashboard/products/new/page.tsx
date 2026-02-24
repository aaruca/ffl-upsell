"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useStore } from "@/lib/hooks/use-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Upload, AlertCircle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import Image from "next/image";

interface Category {
    id: string;
    name: string;
}

export default function NewProductPage() {
    const { store } = useStore();
    const router = useRouter();
    const supabase = createClient();

    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [categoriesLoading, setCategoriesLoading] = useState(true);

    // Form states
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState("");
    const [comparePrice, setComparePrice] = useState("");
    const [cost, setCost] = useState("");
    const [stock, setStock] = useState("1");
    const [condition, setCondition] = useState("new");
    const [platform, setPlatform] = useState("other");
    const [region, setRegion] = useState("region-free");
    const [categoryId, setCategoryId] = useState<string>("none");
    const [images, setImages] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (store) {
            fetchCategories();
        }
    }, [store]);

    async function fetchCategories() {
        if (!store) return;
        try {
            const { data, error } = await supabase
                .from("categories")
                .select("id, name")
                .eq("store_id", store.id)
                .order("name");

            if (error) throw error;
            setCategories(data || []);
        } catch (error) {
            console.error("Error fetching categories:", error);
            toast.error("Error cargando categorias");
        } finally {
            setCategoriesLoading(false);
        }
    }

    function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            setImages((prev) => [...prev, ...newFiles]);

            const newPreviews = newFiles.map((file) => URL.createObjectURL(file));
            setImagePreviews((prev) => [...prev, ...newPreviews]);
        }
    }

    function removeImage(index: number) {
        setImages((prev) => prev.filter((_, i) => i !== index));
        setImagePreviews((prev) => prev.filter((_, i) => i !== index));
    }

    function generateSlug(text: string) {
        return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Date.now().toString(36);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!store) return;
        setLoading(true);

        try {
            // 1. Create product
            const slug = generateSlug(name);

            const productData: any = {
                store_id: store.id,
                name,
                slug,
                description,
                price: parseFloat(price),
                stock_quantity: parseInt(stock),
                condition,
                platform,
                region,
                is_active: true,
            };

            if (comparePrice) productData.compare_price = parseFloat(comparePrice);
            if (cost) productData.cost = parseFloat(cost);
            if (categoryId && categoryId !== "none") productData.category_id = categoryId;

            const { data: product, error: productError } = await supabase
                .from("products")
                .insert(productData)
                .select()
                .single();

            if (productError) throw productError;

            // 2. Upload images
            if (images.length > 0) {
                setUploading(true);
                const imagePromises = images.map(async (file, index) => {
                    const fileExt = file.name.split(".").pop();
                    const fileName = `${product.id}/${Date.now()}-${index}.${fileExt}`;

                    const { error: uploadError } = await supabase.storage
                        .from("product-images")
                        .upload(fileName, file);

                    if (uploadError) throw uploadError;

                    const { data: { publicUrl } } = supabase.storage
                        .from("product-images")
                        .getPublicUrl(fileName);

                    return {
                        product_id: product.id,
                        url: publicUrl,
                        position: index,
                        is_primary: index === 0
                    };
                });

                const uploadedImages = await Promise.all(imagePromises);

                const { error: imagesError } = await supabase
                    .from("product_images")
                    .insert(uploadedImages);

                if (imagesError) throw imagesError;
            }

            toast.success("Producto creado exitosamente");
            router.push("/dashboard/products");
            router.refresh();

        } catch (error: any) {
            console.error("Error creating product:", error);
            toast.error(error.message || "Error al crear el producto");
        } finally {
            setLoading(false);
            setUploading(false);
        }
    }

    return (
        <div className="max-w-4xl space-y-6 pb-20">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/products">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold">Nuevo Producto</h1>
                    <p className="text-sm text-muted-foreground">Agrega un juego, consola o accesorio a tu catalogo</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                {/* Left Column: Details */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
                        <h3 className="font-semibold">Detalles Basicos</h3>
                        <div className="space-y-2">
                            <Label>Nombre del producto</Label>
                            <Input
                                placeholder="Ej: Super Mario Bros. Wonder"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Descripcion</Label>
                            <Textarea
                                placeholder="Describe el estado, contenido, etc."
                                className="h-32 resize-none"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
                        <h3 className="font-semibold">Multimedia</h3>
                        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4">
                            {imagePreviews.map((src, idx) => (
                                <div key={idx} className="relative aspect-square overflow-hidden rounded-lg border border-border">
                                    <Image src={src} alt="Preview" fill className="object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => removeImage(idx)}
                                        className="absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white hover:bg-red-500"
                                    >
                                        <AlertCircle className="h-4 w-4 rotate-45" />
                                    </button>
                                </div>
                            ))}
                            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border/50 hover:border-primary/50 hover:bg-primary/5">
                                <Upload className="h-6 w-6 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">Subir fotos</span>
                                <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageChange} />
                            </label>
                        </div>
                        <p className="text-xs text-muted-foreground">Sube hasta 10 fotos. La primera sera la portada.</p>
                    </div>

                    <div className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
                        <h3 className="font-semibold">Inventario y Precios</h3>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label>Precio de venta</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        className="pl-7"
                                        value={price}
                                        onChange={e => setPrice(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Precio original (opcional)</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        className="pl-7"
                                        value={comparePrice}
                                        onChange={e => setComparePrice(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Costo (privado)</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        className="pl-7"
                                        value={cost}
                                        onChange={e => setCost(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Stock disponible</Label>
                                <Input
                                    type="number"
                                    value={stock}
                                    onChange={e => setStock(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Organization */}
                <div className="space-y-6">
                    <div className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
                        <h3 className="font-semibold">Organizacion</h3>

                        <div className="space-y-2">
                            <Label>Estado</Label>
                            <Select defaultValue="active">
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona estado" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Activo</SelectItem>
                                    <SelectItem value="draft">Borrador</SelectItem>
                                    <SelectItem value="archived">Archivado</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Categoria</Label>
                            <Select value={categoryId} onValueChange={setCategoryId}>
                                <SelectTrigger>
                                    <SelectValue placeholder={categoriesLoading ? "Cargando..." : "Selecciona categoria"} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Sin categoria</SelectItem>
                                    {categories.map((cat) => (
                                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {categories.length === 0 && !categoriesLoading && (
                                <Link href="/dashboard/categories" className="text-xs text-primary hover:underline block pt-1">
                                    + Crear categoria primero
                                </Link>
                            )}
                        </div>
                    </div>

                    <div className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
                        <h3 className="font-semibold">Detalles Gaming</h3>

                        <div className="space-y-2">
                            <Label>Plataforma</Label>
                            <Select value={platform} onValueChange={setPlatform}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="switch">Nintendo Switch</SelectItem>
                                    <SelectItem value="ps5">PlayStation 5</SelectItem>
                                    <SelectItem value="ps4">PlayStation 4</SelectItem>
                                    <SelectItem value="xbox-series">Xbox Series X/S</SelectItem>
                                    <SelectItem value="xbox-one">Xbox One</SelectItem>
                                    <SelectItem value="pc">PC / Steam</SelectItem>
                                    <SelectItem value="3ds">Nintendo 3DS</SelectItem>
                                    <SelectItem value="wii-u">Wii U</SelectItem>
                                    <SelectItem value="retro">Retro</SelectItem>
                                    <SelectItem value="other">Otro</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Condicion</Label>
                            <Select value={condition} onValueChange={setCondition}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="new">Nuevo (Sellado)</SelectItem>
                                    <SelectItem value="cib">Completo en caja (CIB)</SelectItem>
                                    <SelectItem value="loose">Suelto (Loose)</SelectItem>
                                    <SelectItem value="sealed">Sellado (Coleccion)</SelectItem>
                                    <SelectItem value="used">Usado</SelectItem>
                                    <SelectItem value="refurbished">Reacondicionado</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Region</Label>
                            <Select value={region} onValueChange={setRegion}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="region-free">Region Free</SelectItem>
                                    <SelectItem value="ntsc">NTSC (Americana)</SelectItem>
                                    <SelectItem value="pal">PAL (Europea)</SelectItem>
                                    <SelectItem value="ntsc-j">NTSC-J (Japonesa)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="lg:col-span-3 flex justify-end gap-4 border-t border-border/50 pt-6">
                    <Link href="/dashboard/products">
                        <Button variant="outline" type="button">Cancelar</Button>
                    </Link>
                    <Button type="submit" disabled={loading || uploading} className="gradient-gaming text-white px-8">
                        {(loading || uploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {uploading ? "Subiendo imagenes..." : "Crear Producto"}
                    </Button>
                </div>
            </form>
        </div>
    );
}
