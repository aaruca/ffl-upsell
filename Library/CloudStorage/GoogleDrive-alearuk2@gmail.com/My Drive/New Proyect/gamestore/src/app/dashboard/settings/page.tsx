"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/hooks/use-store";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2, Save, Upload, CreditCard, Palette, Store, Check } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
    const { store, setStore, loading: storeLoading } = useStore();
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const supabase = createClient();

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        whatsapp: "",
        instagram: "",
        email: "",
        logo_url: "",
        currency: "USD",
        template: "modern",
        primaryColor: "#000000",
        accentColor: "#B8860B",
        stripeEnabled: false,
        stripeKey: "",
        paypalEnabled: false,
        manualEnabled: false,
        manualInstructions: "",
    });

    useEffect(() => {
        if (store) {
            setFormData({
                name: store.name || "",
                description: store.description || "",
                whatsapp: store.whatsapp || "",
                instagram: store.instagram || "",
                email: store.email || "",
                logo_url: store.logo_url || "",
                currency: store.currency || "USD",
                template: store.theme_config?.template || "modern",
                primaryColor: store.theme_config?.colors?.primary || "#000000",
                accentColor: store.theme_config?.colors?.accent || "#B8860B",
                stripeEnabled: store.payment_config?.stripe_enabled || false,
                stripeKey: store.payment_config?.stripe_public_key || "",
                paypalEnabled: store.payment_config?.paypal_enabled || false,
                manualEnabled: store.payment_config?.manual_enabled || false,
                manualInstructions: store.payment_config?.manual_instructions || "",
            });
        }
    }, [store]);

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0]) return;
        setUploading(true);

        try {
            const file = e.target.files[0];
            const fileExt = file.name.split(".").pop();
            const fileName = `${store?.id}-${Math.random()}.${fileExt}`;
            const filePath = `logos/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from("store-assets")
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from("store-assets").getPublicUrl(filePath);
            setFormData(prev => ({ ...prev, logo_url: data.publicUrl }));
            toast.success("Logo subido correctamente");
        } catch (error: any) {
            toast.error("Error subiendo logo: " + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        if (!store) return;
        setSaving(true);

        try {
            const { error } = await supabase
                .from("stores")
                .update({
                    name: formData.name,
                    description: formData.description,
                    whatsapp: formData.whatsapp,
                    instagram: formData.instagram,
                    email: formData.email,
                    logo_url: formData.logo_url,
                    currency: formData.currency,
                    theme_config: {
                        template: formData.template,
                        colors: {
                            primary: formData.primaryColor,
                            accent: formData.accentColor,
                            background: "#ffffff" // Default for now
                        }
                    },
                    payment_config: {
                        stripe_enabled: formData.stripeEnabled,
                        stripe_public_key: formData.stripeKey,
                        paypal_enabled: formData.paypalEnabled,
                        manual_enabled: formData.manualEnabled,
                        manual_instructions: formData.manualInstructions
                    }
                })
                .eq("id", store.id);

            if (error) throw error;

            // Update local store state properly
            setStore({
                ...store,
                name: formData.name,
                description: formData.description,
                whatsapp: formData.whatsapp,
                instagram: formData.instagram,
                email: formData.email,
                logo_url: formData.logo_url,
                currency: formData.currency,
                theme_config: {
                    template: formData.template,
                    colors: {
                        primary: formData.primaryColor,
                        accent: formData.accentColor,
                        background: "#ffffff"
                    }
                },
                payment_config: {
                    stripe_enabled: formData.stripeEnabled,
                    stripe_public_key: formData.stripeKey,
                    paypal_enabled: formData.paypalEnabled,
                    paypal_client_id: undefined, // Add if needed
                    manual_enabled: formData.manualEnabled,
                    manual_instructions: formData.manualInstructions
                }
            });

            toast.success("Configuración guardada exitosamente");
        } catch (error: any) {
            toast.error("Error guardando configuración: " + error.message);
        } finally {
            setSaving(false);
        }
    };

    if (storeLoading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="max-w-5xl space-y-8 pb-10">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Configuración</h1>
                    <p className="text-muted-foreground">Gestiona tu tienda, diseño y pagos</p>
                </div>
                <Button onClick={handleSave} disabled={saving} className="rounded-xl min-w-[140px]">
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Guardar Cambios
                </Button>
            </div>

            <Tabs defaultValue="general" className="w-full">
                <TabsList className="mb-4">
                    <TabsTrigger value="general" className="gap-2">
                        <Store className="h-4 w-4" /> General
                    </TabsTrigger>
                    <TabsTrigger value="design" className="gap-2">
                        <Palette className="h-4 w-4" /> Diseño
                    </TabsTrigger>
                    <TabsTrigger value="payments" className="gap-2">
                        <CreditCard className="h-4 w-4" /> Pagos
                    </TabsTrigger>
                </TabsList>

                {/* 1. GENERAL SETTINGS */}
                <TabsContent value="general" className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Información de la Tienda</CardTitle>
                                <CardDescription>Detalles principales visibles para tus clientes</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Nombre de la tienda</Label>
                                    <Input
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Descripción</Label>
                                    <Textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        rows={3}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Logo</Label>
                                    <div className="flex items-center gap-4">
                                        {formData.logo_url && (
                                            <img src={formData.logo_url} alt="Logo" className="h-16 w-16 rounded-lg object-cover border" />
                                        )}
                                        <div className="relative">
                                            <Input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleLogoUpload}
                                                className="hidden"
                                                id="logo-upload"
                                                disabled={uploading}
                                            />
                                            <Label
                                                htmlFor="logo-upload"
                                                className="flex cursor-pointer items-center gap-2 rounded-lg border border-input bg-background px-4 py-2 hover:bg-accent hover:text-accent-foreground"
                                            >
                                                <Upload className="h-4 w-4" />
                                                {uploading ? "Subiendo..." : "Subir Logo"}
                                            </Label>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Contacto y Moneda</CardTitle>
                                <CardDescription>Cómo te contactan tus clientes</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>WhatsApp (sin +)</Label>
                                    <Input
                                        value={formData.whatsapp}
                                        onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                                        placeholder="50760000000"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Instagram (@usuario)</Label>
                                    <Input
                                        value={formData.instagram}
                                        onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Email de soporte</Label>
                                    <Input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Moneda</Label>
                                    <Select
                                        value={formData.currency}
                                        onValueChange={(val) => setFormData({ ...formData, currency: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="USD">USD ($)</SelectItem>
                                            <SelectItem value="EUR">EUR (€)</SelectItem>
                                            <SelectItem value="MXN">MXN ($)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* 2. DESIGN SETTINGS */}
                <TabsContent value="design" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Plantilla de la Tienda</CardTitle>
                            <CardDescription>Elige cómo ven tus clientes tu tienda online</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {[
                                    { id: "modern", name: "Modern Clean", desc: "Minimalista, estilo Apple." },
                                    { id: "gaming", name: "Gaming Bold", desc: "Oscuro, contrastes fuertes." },
                                    { id: "classic", name: "Classic Store", desc: "Tradicional y confiable." }
                                ].map((tpl) => (
                                    <div
                                        key={tpl.id}
                                        onClick={() => setFormData({ ...formData, template: tpl.id })}
                                        className={`
                      cursor-pointer rounded-xl border-2 p-4 transition-all hover:scale-[1.02]
                      ${formData.template === tpl.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}
                    `}
                                    >
                                        <div className="mb-3 h-32 w-full rounded-lg bg-secondary/50 flex items-center justify-center text-muted-foreground text-xs">
                                            [Preview {tpl.name}]
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="font-semibold">{tpl.name}</p>
                                                <p className="text-xs text-muted-foreground">{tpl.desc}</p>
                                            </div>
                                            {formData.template === tpl.id && <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center"><Check className="h-3 w-3" /></div>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Paleta de Colores</CardTitle>
                            <CardDescription>Personaliza los colores principales de tu marca</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-3">
                                <Label>Color Primario</Label>
                                <div className="flex gap-2 items-center">
                                    <Input
                                        type="color"
                                        value={formData.primaryColor}
                                        onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                                        className="w-12 h-12 p-1 rounded-lg cursor-pointer"
                                    />
                                    <Input
                                        value={formData.primaryColor}
                                        onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                                        className="uppercase"
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">Usado en botones principales y encabezados.</p>
                            </div>
                            <div className="space-y-3">
                                <Label>Color de Acento</Label>
                                <div className="flex gap-2 items-center">
                                    <Input
                                        type="color"
                                        value={formData.accentColor}
                                        onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
                                        className="w-12 h-12 p-1 rounded-lg cursor-pointer"
                                    />
                                    <Input
                                        value={formData.accentColor}
                                        onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
                                        className="uppercase"
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">Usado para destacar elementos importantes.</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* 3. PAYMENT SETTINGS */}
                <TabsContent value="payments" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Métodos de Pago</CardTitle>
                            <CardDescription>Configura cómo te pagan tus clientes</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6 divide-y divide-border">
                            {/* Stripe */}
                            <div className="flex flex-col gap-4 pb-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">Stripe (Tarjetas de Crédito)</Label>
                                        <p className="text-sm text-muted-foreground">Acepta pagos con tarjeta directamente.</p>
                                    </div>
                                    <Switch
                                        checked={formData.stripeEnabled}
                                        onCheckedChange={(c) => setFormData({ ...formData, stripeEnabled: c })}
                                    />
                                </div>
                                {formData.stripeEnabled && (
                                    <div className="animate-fade-in pl-4 border-l-2 border-primary/20">
                                        <Label>Stripe Public Key</Label>
                                        <Input
                                            type="password"
                                            value={formData.stripeKey}
                                            onChange={(e) => setFormData({ ...formData, stripeKey: e.target.value })}
                                            placeholder="pk_test_..."
                                            className="mt-1"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* PayPal */}
                            <div className="flex flex-col gap-4 py-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">PayPal</Label>
                                        <p className="text-sm text-muted-foreground">Permite pagos rápidos con cuenta PayPal.</p>
                                    </div>
                                    <Switch
                                        checked={formData.paypalEnabled}
                                        onCheckedChange={(c) => setFormData({ ...formData, paypalEnabled: c })}
                                    />
                                </div>
                            </div>

                            {/* Manual / Transfer */}
                            <div className="flex flex-col gap-4 pt-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">Pago Manual / Transferencia</Label>
                                        <p className="text-sm text-muted-foreground">Instrucciones para Yappy, ACH, o efectivo.</p>
                                    </div>
                                    <Switch
                                        checked={formData.manualEnabled}
                                        onCheckedChange={(c) => setFormData({ ...formData, manualEnabled: c })}
                                    />
                                </div>
                                {formData.manualEnabled && (
                                    <div className="animate-fade-in pl-4 border-l-2 border-primary/20">
                                        <Label>Instrucciones de pago</Label>
                                        <Textarea
                                            value={formData.manualInstructions}
                                            onChange={(e) => setFormData({ ...formData, manualInstructions: e.target.value })}
                                            placeholder="Ej: Transferir a Banco General, Cuenta #..."
                                            rows={4}
                                            className="mt-1"
                                        />
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
