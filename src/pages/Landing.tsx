import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowRight, FileText, Sparkles, Wand2, Zap, Languages, Download,
  ShieldCheck, Save, Palette, Users, Menu, X, Check, Blocks,
} from 'lucide-react';
import Logo from '../components/Logo';
import ImagePlaceholder from '../components/landing/ImagePlaceholder';

/* ---------- small building blocks ---------- */

const Section = ({ id, className = '', children }: { id?: string; className?: string; children: React.ReactNode }) => (
  <section id={id} className={`mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 ${className}`}>
    {children}
  </section>
);

const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center gap-2 rounded-full border border-line-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-500">
    <Sparkles size={13} /> {children}
  </span>
);

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.5 },
};

/* ---------- data ---------- */

const features = [
  { icon: Blocks, title: 'Constructor por bloques', desc: 'Arrastra y suelta secciones —logo, ítems, totales, notas— y arma la factura exacta que necesitas.' },
  { icon: Save, title: 'Guardado automático', desc: 'Tus cambios se guardan solos mientras editas. Nunca pierdes el trabajo en curso.' },
  { icon: Download, title: 'Exporta a PDF y Word', desc: 'Descarga documentos profesionales listos para enviar, o compártelos con un enlace público.' },
  { icon: Languages, title: 'Multilingüe', desc: 'Interfaz y documentos en español e inglés, con formato de moneda y fechas por región.' },
  { icon: Palette, title: 'Tu marca', desc: 'Sube tu logo una sola vez, elige color y tipografía, y reutilízalos en todas tus facturas.' },
  { icon: ShieldCheck, title: 'Seguro por diseño', desc: 'Cuentas protegidas, sesiones con cookies httpOnly y contenido saneado antes de mostrarse.' },
];

const steps = [
  { icon: FileText, tag: 'Crea', title: 'Diseña tu factura', desc: 'Arranca desde el editor y arma el documento bloque a bloque con tus datos.' },
  { icon: Wand2, tag: 'Personaliza', title: 'Ajusta a tu marca', desc: 'Añade tu logo, color y tipografía. La numeración y tus datos se completan solos.' },
  { icon: Zap, tag: 'Comparte', title: 'Publica y envía', desc: 'Exporta a PDF/Word o publica un enlace y envíalo a tu cliente al instante.' },
];

const blocks = [
  { icon: FileText, label: 'Encabezado, empresa y cliente' },
  { icon: Blocks, label: 'Tabla de ítems y totales' },
  { icon: Palette, label: 'Notas, términos y datos bancarios' },
];

/* ---------- page ---------- */

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { href: '#features', label: 'Características' },
    { href: '#how', label: 'Cómo funciona' },
    { href: '#blocks', label: 'Editor' },
  ];

  return (
    <div className="min-h-screen bg-white font-body text-slate-700 antialiased">
      {/* ===================== NAVBAR ===================== */}
      <header className="sticky top-0 z-40 border-b border-line-200/70 bg-white/90 backdrop-blur">
        <Section className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <Logo variant="iso" className="h-8 w-8 object-contain" />
            <span className="font-display text-lg font-bold tracking-tight text-brand-900">
              Invoice<span className="text-brand-500">Gen</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} className="text-sm font-medium text-slate-600 transition-colors hover:text-brand-500">
                {l.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Link to="/login" className="text-sm font-semibold text-slate-700 transition-colors hover:text-brand-500">
              Iniciar sesión
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-400"
            >
              Empezar gratis <ArrowRight size={16} />
            </Link>
          </div>

          <button
            className="md:hidden text-brand-900"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Abrir menú"
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </Section>

        {menuOpen && (
          <div className="border-t border-line-200/70 bg-white md:hidden">
            <Section className="flex flex-col gap-1 py-3">
              {navLinks.map((l) => (
                <a key={l.href} href={l.href} onClick={() => setMenuOpen(false)} className="rounded-lg px-2 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                  {l.label}
                </a>
              ))}
              <div className="mt-2 flex flex-col gap-2">
                <Link to="/login" className="rounded-xl border border-line-200 px-4 py-2 text-center text-sm font-semibold text-slate-700">
                  Iniciar sesión
                </Link>
                <Link to="/register" className="rounded-xl bg-brand-500 px-4 py-2 text-center text-sm font-semibold text-white">
                  Empezar gratis
                </Link>
              </div>
            </Section>
          </div>
        )}
      </header>

      {/* ===================== HERO ===================== */}
      <div className="relative overflow-hidden">
        <div className="bg-grid-brand absolute inset-0 -z-10 opacity-60" />
        <div className="absolute inset-x-0 top-0 -z-10 h-96 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(20,110,245,0.10),transparent)]" />

        <Section className="grid items-center gap-12 pt-16 pb-20 lg:grid-cols-2 lg:pt-24">
          <motion.div {...fadeUp}>
            <Eyebrow>Facturación sin fricción</Eyebrow>
            <h1 className="mt-5 font-display text-4xl font-bold leading-[1.1] tracking-tight text-brand-900 sm:text-5xl lg:text-6xl">
              Facturas profesionales,{' '}
              <span className="text-brand-500">generadas</span> en minutos.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
              InvoiceGen combina un editor por bloques, guardado automático y exportación instantánea
              para que crear, guardar y compartir facturas sea rápido, prolijo y sin fricción.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-brand-400"
              >
                Crear mi primera factura <ArrowRight size={18} />
              </Link>
              <a
                href="#how"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-line-200 bg-white px-6 py-3 text-base font-semibold text-brand-900 transition-colors hover:border-brand-400 hover:text-brand-500"
              >
                Ver cómo funciona
              </a>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-500">
              {['Sin tarjeta de crédito', 'PDF y Word', 'Español e inglés'].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5">
                  <Check size={16} className="text-accent-500" /> {t}
                </span>
              ))}
            </div>
          </motion.div>

          <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.1 }} className="relative">
            {/* Floating accent card */}
            <div className="absolute -left-4 -top-4 z-10 hidden rounded-2xl border border-line-200 bg-white px-4 py-3 shadow-sm sm:flex sm:items-center sm:gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-500/15 text-accent-500">
                <Save size={18} />
              </span>
              <div className="leading-tight">
                <p className="text-xs font-bold text-brand-900">Guardado automático</p>
                <p className="text-[11px] text-slate-400">Nunca pierdes tu trabajo</p>
              </div>
            </div>

            <ImagePlaceholder
              label="Captura del editor de facturas"
              hint="Recomendado 1200×900 · PNG/WebP"
              className="aspect-[4/3] w-full rounded-3xl border border-line-200 bg-slate-50"
            />
          </motion.div>
        </Section>
      </div>

      {/* ===================== TRUST STRIP ===================== */}
      <Section className="pb-8">
        <div className="rounded-2xl border border-line-200 bg-slate-50/60 px-6 py-6">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-slate-400">
            Con la confianza de profesionales y pequeños equipos
          </p>
          <div className="mt-5 grid grid-cols-2 items-center gap-6 sm:grid-cols-4">
            {['Logo 1', 'Logo 2', 'Logo 3', 'Logo 4'].map((l) => (
              <ImagePlaceholder key={l} label={l} hint="120×40" className="h-12" />
            ))}
          </div>
        </div>
      </Section>

      {/* ===================== FEATURES ===================== */}
      <Section id="features" className="py-20">
        <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
          <Eyebrow>Todo lo que necesitas</Eyebrow>
          <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-brand-900 sm:text-4xl">
            Diseñado para facturar mejor
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Un conjunto de herramientas moderno para crear documentos impecables sin perder tiempo.
          </p>
        </motion.div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              {...fadeUp}
              transition={{ duration: 0.45, delay: i * 0.05 }}
              className="group rounded-2xl border border-line-200 bg-white p-6 transition-colors hover:border-brand-400"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500 transition-colors group-hover:bg-brand-500 group-hover:text-white">
                <f.icon size={22} />
              </span>
              <h3 className="mt-4 font-display text-lg font-semibold text-brand-900">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ===================== HOW IT WORKS ===================== */}
      <div className="bg-brand-900">
        <Section id="how" className="py-20">
          <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent-500">
              <Zap size={13} /> El flujo
            </span>
            <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              De la idea a la factura, sin fricción
            </h2>
            <p className="mt-4 text-lg text-slate-300">
              Tres pasos simples: <span className="text-white">crea</span>,{' '}
              <span className="text-white">personaliza</span> y <span className="text-white">comparte</span>.
            </p>
          </motion.div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {steps.map((s, i) => (
              <motion.div
                key={s.title}
                {...fadeUp}
                transition={{ duration: 0.45, delay: i * 0.08 }}
                className="relative rounded-2xl border border-white/10 bg-white/5 p-6"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-500 text-brand-900">
                    <s.icon size={22} />
                  </span>
                  <span className="font-display text-sm font-bold uppercase tracking-widest text-white/40">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <p className="mt-5 text-xs font-bold uppercase tracking-widest text-accent-500">{s.tag}</p>
                <h3 className="mt-1 font-display text-xl font-semibold text-white">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </Section>
      </div>

      {/* ===================== BLOCKS SHOWCASE ===================== */}
      <Section id="blocks" className="py-20">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <motion.div {...fadeUp} className="order-2 lg:order-1">
            <ImagePlaceholder
              label="Captura: editor drag-and-drop"
              hint="Recomendado 1200×900"
              className="aspect-[4/3] w-full rounded-3xl border border-line-200 bg-slate-50"
            />
          </motion.div>

          <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.1 }} className="order-1 lg:order-2">
            <Eyebrow>Editor por bloques</Eyebrow>
            <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-brand-900 sm:text-4xl">
              Arma cada factura a tu manera
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Sin plantillas rígidas: agrega, quita y reordena los bloques que necesitas.
              El formulario se adapta a lo que pones en el documento.
            </p>
            <ul className="mt-6 space-y-3">
              {blocks.map((b) => (
                <li key={b.label} className="flex items-center gap-3 text-slate-700">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500">
                    <b.icon size={18} />
                  </span>
                  {b.label}
                </li>
              ))}
            </ul>
            <Link
              to="/register"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-400"
            >
              Probar el editor <ArrowRight size={16} />
            </Link>
          </motion.div>
        </div>
      </Section>

      {/* ===================== SPLIT FEATURE (brand + product) ===================== */}
      <Section className="pb-20">
        <div className="grid items-center gap-10 rounded-3xl border border-line-200 bg-slate-50/60 p-8 lg:grid-cols-2 lg:p-12">
          <motion.div {...fadeUp}>
            <span className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-accent-500">
              <Users size={16} /> Clientes y datos
            </span>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-brand-900">
              Tus clientes y tu marca, siempre a mano
            </h2>
            <p className="mt-4 text-slate-600">
              Guarda tu información de empresa y tu libreta de clientes una vez. Cada factura nueva se completa
              sola con tus datos, y tu logo se reutiliza automáticamente.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                'Libreta de clientes con autocompletado',
                'Logo de empresa reutilizable',
                'Numeración automática de facturas',
                'Guardado automático mientras editas',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-slate-700">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-500/15 text-accent-500">
                    <Check size={13} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.1 }}>
            <ImagePlaceholder
              label="Captura: panel de clientes / ajustes de marca"
              hint="Recomendado 1000×750"
              className="aspect-[4/3] w-full rounded-2xl border border-line-200 bg-white"
            />
          </motion.div>
        </div>
      </Section>

      {/* ===================== FINAL CTA ===================== */}
      <Section className="pb-24">
        <motion.div
          {...fadeUp}
          className="relative overflow-hidden rounded-3xl bg-brand-500 px-8 py-14 text-center sm:px-12"
        >
          <div className="bg-grid-brand absolute inset-0 opacity-20" />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Crea tu próxima factura en minutos
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-blue-50">
              Regístrate gratis y empieza a generar documentos profesionales hoy mismo.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-base font-semibold text-brand-500 transition-transform hover:-translate-y-0.5"
              >
                Empezar gratis <ArrowRight size={18} />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/40 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-white/10"
              >
                Ya tengo cuenta
              </Link>
            </div>
          </div>
        </motion.div>
      </Section>

      {/* ===================== FOOTER ===================== */}
      <footer className="border-t border-line-200 bg-white">
        <Section className="flex flex-col items-center justify-between gap-6 py-10 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <Logo variant="iso" className="h-7 w-7 object-contain" />
            <span className="font-display text-base font-bold tracking-tight text-brand-900">
              Invoice<span className="text-brand-500">Gen</span>
            </span>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-500">
            <a href="#features" className="hover:text-brand-500">Características</a>
            <a href="#how" className="hover:text-brand-500">Cómo funciona</a>
            <a href="#blocks" className="hover:text-brand-500">Editor</a>
            <Link to="/login" className="hover:text-brand-500">Iniciar sesión</Link>
          </nav>

          <p className="text-sm text-slate-400">
            Hecho por{' '}
            <a href="https://denilson.me" target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-500 hover:text-brand-400">
              denilson.me
            </a>
          </p>
        </Section>
        <div className="border-t border-line-200/70 py-4">
          <p className="text-center text-xs text-slate-400">
            © {new Date().getFullYear()} InvoiceGen · invoice.denilson.me
          </p>
        </div>
      </footer>
    </div>
  );
}
