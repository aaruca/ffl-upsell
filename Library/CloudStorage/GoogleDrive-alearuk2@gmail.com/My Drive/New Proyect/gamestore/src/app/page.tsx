import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Gamepad2,
  ShoppingCart,
  MessageCircle,
  Globe,
  Zap,
  Smartphone,
  BarChart3,
  ArrowRight,
  ArrowUpRight,
  Check,
} from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";

export default function Home() {
  const features = [
    {
      icon: Globe,
      title: "Catálogo online profesional",
      description: "Tu tienda con URL personalizada, diseño premium y compatible por WhatsApp y redes sociales.",
    },
    {
      icon: ShoppingCart,
      title: "Carrito y checkout real",
      description: "A diferencia de otros, tus clientes pueden comprar directamente sin salir de tu tienda.",
    },
    {
      icon: MessageCircle,
      title: "WhatsApp integrado",
      description: "Botón flotante, mensajes pre-formateados con el pedido y notificaciones al vendedor.",
    },
    {
      icon: Smartphone,
      title: "POS punto de venta",
      description: "Cobra en persona con tu teléfono o computadora. Scanner de código de barras incluido.",
    },
    {
      icon: Zap,
      title: "Hecho para gaming",
      description: "Campos especializados: plataforma, condición (CIB/Loose/Sealed), región y más.",
    },
    {
      icon: BarChart3,
      title: "Inventario inteligente",
      description: "Control de stock, alertas de stock bajo, variantes, historial y más.",
    },
  ];

  const plans = [
    {
      name: "Gratis",
      price: "$0",
      description: "Para empezar",
      features: ["Hasta 50 productos", "1 tienda", "Checkout básico", "WhatsApp"],
      cta: "Empezar gratis",
      popular: false,
    },
    {
      name: "Pro",
      price: "$9",
      description: "Para crecer",
      features: ["Productos ilimitados", "Dominio personalizado", "Sin comisiones", "Soporte prioritario", "POS incluido"],
      cta: "Prueba 14 días",
      popular: true,
    },
    {
      name: "Business",
      price: "$29",
      description: "Para equipos",
      features: ["Todo de Pro", "Multi-usuario", "API acceso", "Reportes avanzados", "Onboarding dedicado"],
      cta: "Contactar ventas",
      popular: false,
    },
  ];

  return (
    <div className="min-h-screen bg-background dark:bg-[#121214] text-foreground">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 glass border-b border-border/30 dark:border-white/5">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary dark:bg-[#2C2C30]">
              <Gamepad2 className="h-5 w-5" />
            </div>
            <span className="text-xl font-semibold">GameStore</span>
          </Link>

          <div className="flex items-center gap-4">
            <ModeToggle />
            <Link href="/login">
              <Button variant="ghost" className="hidden sm:inline-flex rounded-xl">
                Iniciar sesión
              </Button>
            </Link>
            <Link href="/register">
              <Button className="rounded-xl bg-design-gold text-slate-900 hover:bg-[#b89a6b]">
                Crear tienda gratis
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-secondary dark:bg-[#2C2C30] px-4 py-2 text-sm mb-8">
            <span className="h-2 w-2 rounded-full bg-design-gold animate-pulse" />
            La plataforma #1 para tiendas gaming en LATAM
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 max-w-4xl mx-auto">
            Vende videojuegos{" "}
            <span className="text-design-gold">como un pro</span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
            Crea tu tienda gaming online en minutos. Catálogo profesional, carrito de compras, POS, WhatsApp integrado y todo lo que necesitas para vender.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link href="/register">
              <Button size="lg" className="rounded-xl bg-design-gold text-slate-900 hover:bg-[#b89a6b] h-12 px-8 text-base">
                Crear mi tienda gratis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/store/demo">
              <Button size="lg" variant="outline" className="rounded-xl h-12 px-8 text-base border-border/50 dark:border-white/10">
                Ver demo
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {[
              { label: "Tiendas activas", value: "2,500+", unit: "tiendas" },
              { label: "Productos vendidos", value: "150K" },
              { label: "Tiempo de setup", value: "2", unit: "min" },
              { label: "Satisfacción", value: "4.9", unit: "★" },
            ].map((stat, index) => (
              <div
                key={index}
                className={`
                  p-5 rounded-[2rem] flex flex-col justify-between h-32 lg:h-36
                  ${index === 0
                    ? "bg-design-gold text-slate-900"
                    : "bg-card dark:bg-[#1E1E22] border border-border/30 dark:border-white/5"
                  }
                `}
              >
                <div className="flex justify-between items-start">
                  <span className={`text-sm ${index === 0 ? "text-slate-800" : "text-muted-foreground"}`}>
                    {stat.label}
                  </span>
                  <ArrowUpRight size={14} className={index === 0 ? "text-slate-700" : "text-muted-foreground"} />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl lg:text-3xl font-bold">{stat.value}</span>
                  {stat.unit && (
                    <span className={`text-sm ${index === 0 ? "text-slate-700" : "text-muted-foreground"}`}>
                      {stat.unit}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 lg:py-32 bg-secondary/30 dark:bg-[#1E1E22]/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Todo lo que necesitas</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Mucho más que un simple catálogo online
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="p-6 lg:p-8 rounded-2xl bg-card dark:bg-[#1E1E22] border border-border/30 dark:border-white/5 hover:scale-[1.02] transition-transform duration-300"
              >
                <div className="h-12 w-12 rounded-xl bg-secondary dark:bg-[#2C2C30] flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Precios simples</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Empieza gratis, crece cuando quieras
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan, index) => (
              <div
                key={index}
                className={`
                  relative p-6 lg:p-8 rounded-2xl border
                  ${plan.popular
                    ? "bg-design-gold text-slate-900 border-design-gold"
                    : "bg-card dark:bg-[#1E1E22] border-border/30 dark:border-white/5"
                  }
                `}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-slate-900 text-white text-xs font-medium">
                    Más popular
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-1">{plan.name}</h3>
                  <p className={`text-sm ${plan.popular ? "text-slate-700" : "text-muted-foreground"}`}>
                    {plan.description}
                  </p>
                </div>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className={`text-sm ${plan.popular ? "text-slate-700" : "text-muted-foreground"}`}>/mes</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <Check className={`h-4 w-4 ${plan.popular ? "text-slate-700" : "text-design-gold"}`} />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full rounded-xl h-11 ${plan.popular
                      ? "bg-slate-900 text-white hover:bg-slate-800"
                      : "bg-design-gold text-slate-900 hover:bg-[#b89a6b]"
                    }`}
                >
                  {plan.cta}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-32 bg-secondary/30 dark:bg-[#1E1E22]/50">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            ¿Listo para empezar?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Únete a miles de vendedores gaming que ya usan GameStore
          </p>
          <Link href="/register">
            <Button size="lg" className="rounded-xl bg-design-gold text-slate-900 hover:bg-[#b89a6b] h-12 px-8 text-base">
              Crear mi tienda gratis
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border/30 dark:border-white/5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary dark:bg-[#2C2C30]">
                <Gamepad2 className="h-5 w-5" />
              </div>
              <span className="font-semibold">GameStore</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} GameStore. Hecho para gamers, por gamers.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
