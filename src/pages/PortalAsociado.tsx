// src/pages/PortalAsociado.tsx
// Portal del Socio — diseño bancario profesional (estilo BCP)
// Paleta: Azul Azure (#1a4fa0) · Verde Esmeralda (#059669) · Blanco

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  FileText,
  User,
  History,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Building2,
  Mail,
  Hash,
  Calendar,
  MapPin,
  Phone,
  ChevronRight,
  Loader2,
  X,
  Settings,
  LayoutDashboard,
} from 'lucide-react';

/** Roles con acceso al panel de administración */
const ADMIN_ROLES = [
  'presidencia', 'administrador', 'super_admin', 'admin',
  'secretaria', 'tesoreria', 'vocal', 'seguridad', 'coordinador',
];
import { obtenerEmpadronadoPorAuthUid } from '@/services/empadronados';
import {
  obtenerChargesPorEmpadronadoV2,
  obtenerEstadoCuentaEmpadronado,
} from '@/services/cobranzas-v2';
import { Empadronado } from '@/types/empadronados';
import { ChargeV2, PagoV2 } from '@/types/cobranzas-v2';

// ─── helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(n);

const fmtDate = (ts: number) =>
  ts ? new Date(ts).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const calcAntiguedad = (fechaIngreso: number): string => {
  if (!fechaIngreso) return '—';
  const diff = Date.now() - fechaIngreso;
  const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  if (years >= 1) return `${years} año${years !== 1 ? 's' : ''}`;
  const months = Math.floor(diff / (1000 * 60 * 60 * 24 * 30.44));
  return `${months} mes${months !== 1 ? 'es' : ''}`;
};

const estadoChargeBadge = (estado: ChargeV2['estado']) => {
  const map: Record<string, { label: string; cls: string }> = {
    pendiente:  { label: 'Pendiente',  cls: 'bg-amber-100 text-amber-800 border-amber-200' },
    pagado:     { label: 'Pagado',     cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    vencido:    { label: 'Vencido',    cls: 'bg-red-100 text-red-800 border-red-200' },
    anulado:    { label: 'Anulado',    cls: 'bg-gray-100 text-gray-500 border-gray-200' },
    moroso:     { label: 'Moroso',     cls: 'bg-red-100 text-red-800 border-red-200' },
  };
  const cfg = map[estado] ?? { label: estado, cls: 'bg-gray-100 text-gray-600 border-gray-200' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
};

// ─── Modal genérico ───────────────────────────────────────────────────────────

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({
  title, onClose, children,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center">
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <X className="h-5 w-5 text-gray-500" />
        </button>
      </div>
      <div className="overflow-y-auto px-6 py-4 flex-1">{children}</div>
    </div>
  </div>
);

// ─── Componente principal ─────────────────────────────────────────────────────

type ActiveModal = 'recibos' | 'datos' | 'historial' | 'pagar' | null;

export default function PortalAsociado() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const isAdmin = ADMIN_ROLES.includes((profile?.roleId ?? '').toLowerCase());

  const [empadronado, setEmpadronado]   = useState<Empadronado | null>(null);
  const [charges, setCharges]           = useState<ChargeV2[]>([]);
  const [pagos, setPagos]               = useState<PagoV2[]>([]);
  const [deudaTotal, setDeudaTotal]     = useState(0);
  const [loading, setLoading]           = useState(true);
  const [noVinculado, setNoVinculado]   = useState(false);
  const [modal, setModal]               = useState<ActiveModal>(null);
  const iniciado = useRef(false);

  useEffect(() => {
    if (!user?.uid || iniciado.current) return;
    iniciado.current = true;

    const cargar = async () => {
      try {
        const emp = await obtenerEmpadronadoPorAuthUid(user.uid);
        if (!emp) { setNoVinculado(true); return; }
        setEmpadronado(emp);

        const cuenta = await obtenerEstadoCuentaEmpadronado(emp.id);
        const activeCharges = (cuenta.charges ?? []).filter(c => !c.anulado);
        setCharges(activeCharges);
        setPagos(cuenta.pagos ?? []);

        // Deuda VENCIDA = morosos (siempre) + pendientes cuya fecha ya pasó
        const ahora = Date.now();
        const vencida = activeCharges
          .filter(c => Number(c.saldo) > 0 && (
            c.estado === 'moroso' ||
            (c.estado === 'pendiente' && ahora > c.fechaVencimiento)
          ))
          .reduce((s, c) => s + Number(c.saldo), 0);
        setDeudaTotal(vencida);
      } catch (e) {
        console.error('Portal socio error:', e);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [user?.uid]);

  // ── estados de carga / sin vínculo ─────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="h-10 w-10 animate-spin mx-auto text-[#1a4fa0]" />
          <p className="text-slate-500 text-sm">Cargando tu cuenta…</p>
        </div>
      </div>
    );
  }

  if (noVinculado || !empadronado) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-800">Cuenta no vinculada</h2>
          <p className="text-gray-500 text-sm">
            Tu cuenta de acceso aún no está asociada a un padrón de socio.
            Comunícate con la administración para completar el proceso.
          </p>
          {isAdmin && (
            <button
              onClick={() => navigate('/inicio')}
              className="mt-2 flex items-center gap-2 mx-auto bg-[#1a4fa0] hover:bg-[#163d80] text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
            >
              <LayoutDashboard className="h-4 w-4" />
              Ir al Panel de Administración
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── datos de pantalla ──────────────────────────────────────────────────────

  const alDia       = deudaTotal <= 0;
  const ahora       = Date.now();

  // Cuotas vencidas: morosos + pendientes cuya fecha ya pasó (misma lógica que deudaTotal)
  const vencidas    = charges.filter(c =>
    Number(c.saldo) > 0 && (
      c.estado === 'moroso' ||
      (c.estado === 'pendiente' && ahora > c.fechaVencimiento)
    )
  );

  // Cuotas futuras (aún no vencen)
  const futuras     = charges.filter(c =>
    Number(c.saldo) > 0 &&
    c.estado === 'pendiente' && ahora <= c.fechaVencimiento
  );

  const pendientes  = [...vencidas, ...futuras];
  const pagosPagados = pagos.filter(p => p.estado === 'aprobado' || p.estado === 'pagado');
  const ultimosPagos = pagosPagados.slice(0, 8);

  const acciones = [
    {
      id:    'recibos'   as ActiveModal,
      icon:  FileText,
      label: 'Ver Recibos',
      desc:  'Cuotas y comprobantes',
    },
    {
      id:    'datos'     as ActiveModal,
      icon:  User,
      label: 'Mis Datos',
      desc:  'Información de padrón',
    },
    {
      id:    'historial' as ActiveModal,
      icon:  History,
      label: 'Historial',
      desc:  'Pagos realizados',
    },
    {
      id:    'pagar'     as ActiveModal,
      icon:  CreditCard,
      label: 'Pagar Cuota',
      desc:  'Cuota del mes actual',
    },
  ] as const;

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-100">

      {/* ── HEADER CARD ─────────────────────────────────────── */}
      <div className="bg-[#1a4fa0] px-6 pt-8 pb-0">
        {/* sub-branding + botón admin */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-200" />
            <span className="text-blue-200 text-sm font-medium tracking-wide uppercase">
              JPUSAP · Portal del Socio
            </span>
          </div>
          {isAdmin && (
            <button
              onClick={() => navigate('/inicio')}
              title="Panel de Administración"
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-200"
            >
              <Settings className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Gestión Admin</span>
              <span className="sm:hidden">Admin</span>
            </button>
          )}
        </div>

        {/* nombre + padrón */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 pb-6">
          <div>
            <p className="text-blue-200 text-sm mb-1">Bienvenido,</p>
            <h1 className="text-white text-3xl font-bold leading-tight">
              {empadronado.nombre} {empadronado.apellidos}
            </h1>
            <p className="text-blue-200 text-sm mt-1 flex items-center gap-1.5">
              <Hash className="h-3.5 w-3.5" />
              Padrón&nbsp;
              <span className="text-white font-semibold">{empadronado.numeroPadron}</span>
              {empadronado.manzana && (
                <>
                  &nbsp;·&nbsp;
                  <MapPin className="h-3.5 w-3.5" />
                  Mz.&nbsp;{empadronado.manzana}
                  {empadronado.lote && ` · Lt. ${empadronado.lote}`}
                </>
              )}
            </p>
          </div>

          {/* Estado de cuenta — pastilla flotante */}
          {alDia ? (
            <div className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-400/40 rounded-2xl px-5 py-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-300 shrink-0" />
              <div>
                <p className="text-emerald-200 text-xs">Estado de Cuenta</p>
                <p className="text-emerald-300 font-bold text-lg leading-tight">¡Estás al día!</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-red-500/20 border border-red-400/40 rounded-2xl px-5 py-3">
              <AlertTriangle className="h-6 w-6 text-red-300 shrink-0" />
              <div>
                <p className="text-red-200 text-xs">Deuda Vencida</p>
                <p className="text-white font-bold text-lg leading-tight">{fmt(deudaTotal)}</p>
              </div>
            </div>
          )}
        </div>

        {/* pestañas de navegación (decorativas) */}
        <div className="flex gap-6 border-t border-white/10">
          <button className="text-white text-sm font-semibold py-3 border-b-2 border-white">
            Inicio
          </button>
          <button
            onClick={() => setModal('historial')}
            className="text-blue-300 text-sm py-3 border-b-2 border-transparent hover:text-white transition-colors"
          >
            Historial
          </button>
          <button
            onClick={() => setModal('datos')}
            className="text-blue-300 text-sm py-3 border-b-2 border-transparent hover:text-white transition-colors"
          >
            Mis Datos
          </button>
        </div>
      </div>

      {/* ── CONTENIDO ───────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* ── ACTION GRID ─────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className={`grid gap-4 ${isAdmin ? 'grid-cols-5' : 'grid-cols-4'}`}>
            {acciones.map(({ id, icon: Icon, label, desc }) => (
              <button
                key={id}
                onClick={() => setModal(id)}
                className="flex flex-col items-center gap-2 group"
              >
                <div className="w-14 h-14 rounded-full bg-[#059669] flex items-center justify-center shadow-md group-hover:bg-[#047857] group-hover:shadow-lg transition-all duration-200">
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold text-gray-700 leading-tight">{label}</p>
                  <p className="text-[10px] text-gray-400 leading-tight mt-0.5 hidden sm:block">{desc}</p>
                </div>
              </button>
            ))}

            {/* 5to botón: solo para admins */}
            {isAdmin && (
              <button
                onClick={() => navigate('/inicio')}
                className="flex flex-col items-center gap-2 group"
              >
                <div className="w-14 h-14 rounded-full bg-[#1a4fa0] flex items-center justify-center shadow-md group-hover:bg-[#163d80] group-hover:shadow-lg transition-all duration-200">
                  <LayoutDashboard className="h-6 w-6 text-white" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold text-gray-700 leading-tight">Gestión Admin</p>
                  <p className="text-[10px] text-gray-400 leading-tight mt-0.5 hidden sm:block">Panel administrativo</p>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* ── CARGOS PENDIENTES ───────────────────────────── */}
        {pendientes.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                <h2 className="text-sm font-semibold text-gray-700">Cuotas pendientes</h2>
              </div>
              <span className="text-xs text-gray-400">{pendientes.length} cargo{pendientes.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="divide-y">
              {pendientes.map(c => (
                <div key={c.id} className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center">
                      <Calendar className="h-4 w-4 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        Cuota {c.periodo.slice(0, 4)}-{c.periodo.slice(4, 6)}
                      </p>
                      <p className="text-xs text-gray-400">
                        Vence: {fmtDate(c.fechaVencimiento)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    {estadoChargeBadge(c.estado)}
                    <span className="text-sm font-bold text-gray-800">{fmt(c.saldo)}</span>
                  </div>
                </div>
              ))}
            </div>
            {!alDia && (
              <div className="px-6 py-3 bg-slate-50 flex justify-end border-t">
                <button
                  onClick={() => setModal('pagar')}
                  className="flex items-center gap-1.5 bg-[#059669] hover:bg-[#047857] text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
                >
                  Pagar ahora
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── ÚLTIMOS MOVIMIENTOS ─────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-[#1a4fa0]" />
              <h2 className="text-sm font-semibold text-gray-700">Últimos pagos</h2>
            </div>
            {pagos.length > 8 && (
              <button
                onClick={() => setModal('historial')}
                className="text-xs text-[#1a4fa0] font-medium hover:underline"
              >
                Ver todos
              </button>
            )}
          </div>

          {ultimosPagos.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">
              No hay pagos registrados aún.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left">
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Período</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha de pago</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Método</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Monto</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {ultimosPagos.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-3.5">
                        <span className="font-medium text-gray-800">
                          {p.periodo.slice(0, 4)}-{p.periodo.slice(4, 6)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-gray-600">
                        {fmtDate(p.fechaPagoRegistrada)}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-gray-500 capitalize">{p.metodoPago ?? '—'}</span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-semibold text-gray-800">
                        {fmt(p.monto)}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="h-3 w-3" />
                          Pagado
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── DATOS RÁPIDOS (read-only) ────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <User className="h-4 w-4 text-[#1a4fa0]" />
            Información del socio
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Hash,     label: 'DNI',        value: empadronado.dni },
              { icon: Calendar, label: 'Antigüedad',  value: calcAntiguedad(empadronado.fechaIngreso) },
              { icon: Mail,     label: 'Correo',      value: empadronado.emailAcceso ?? '—' },
              {
                icon: Building2,
                label: 'Vivienda',
                value: empadronado.estadoVivienda === 'construida'
                  ? 'Construida'
                  : empadronado.estadoVivienda === 'construccion'
                  ? 'En construcción'
                  : 'Terreno',
              },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-xl bg-slate-50 p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <Icon className="h-3.5 w-3.5 text-gray-400" />
                  <span className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">{label}</span>
                </div>
                <p className="text-sm font-semibold text-gray-700 truncate">{value}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ══════════════════════════════════════════════════════
          MODALES
      ══════════════════════════════════════════════════════ */}

      {/* ── Modal: Ver Recibos ─────────────────────────────── */}
      {modal === 'recibos' && (
        <Modal title="Ver Recibos" onClose={() => setModal(null)}>
          {charges.length === 0 ? (
            <p className="text-center text-gray-400 py-8">No hay recibos generados.</p>
          ) : (
            <div className="space-y-2">
              {charges.map(c => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#1a4fa0]/10 flex items-center justify-center">
                      <FileText className="h-4 w-4 text-[#1a4fa0]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        Cuota {c.periodo.slice(0, 4)}-{c.periodo.slice(4, 6)}
                      </p>
                      <p className="text-xs text-gray-400">
                        Original: {fmt(c.montoOriginal)} · Pagado: {fmt(c.montoPagado)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {estadoChargeBadge(c.estado)}
                    <p className="text-xs text-gray-400 mt-1">Saldo: {fmt(c.saldo)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {/* ── Modal: Mis Datos ───────────────────────────────── */}
      {modal === 'datos' && (
        <Modal title="Mis Datos (Solo lectura)" onClose={() => setModal(null)}>
          <div className="space-y-3">
            {[
              { label: 'Nombre completo', value: `${empadronado.nombre} ${empadronado.apellidos}` },
              { label: 'N.° de padrón',  value: empadronado.numeroPadron },
              { label: 'DNI',             value: empadronado.dni },
              { label: 'Correo de acceso', value: empadronado.emailAcceso ?? '—' },
              { label: 'Fecha de ingreso', value: fmtDate(empadronado.fechaIngreso) },
              { label: 'Antigüedad',       value: calcAntiguedad(empadronado.fechaIngreso) },
              { label: 'Manzana',          value: empadronado.manzana ?? '—' },
              { label: 'Lote',             value: empadronado.lote ?? '—' },
              { label: 'Etapa',            value: empadronado.etapa ?? '—' },
              { label: 'Estado de vivienda', value: empadronado.estadoVivienda },
              { label: 'Género',           value: empadronado.genero },
              {
                label: 'Miembros de familia',
                value: (empadronado.miembrosFamilia ?? []).length > 0
                  ? (empadronado.miembrosFamilia ?? []).map(m => `${m.nombre} ${m.apellidos} (${m.parentezco})`).join(', ')
                  : '—',
              },
              {
                label: 'Teléfonos',
                value: (empadronado.telefonos ?? []).length > 0
                  ? (empadronado.telefonos ?? []).map(t => t.numero).join(', ')
                  : '—',
              },
              {
                label: 'Vehículos',
                value: (empadronado.vehiculos ?? []).length > 0
                  ? (empadronado.vehiculos ?? []).map(v => `${v.placa} (${v.tipo})`).join(', ')
                  : '—',
              },
              { label: 'Observaciones', value: empadronado.observaciones ?? '—' },
            ].map(({ label, value }) => (
              <div key={label} className="flex gap-4 py-2 border-b border-gray-50 last:border-0">
                <span className="w-44 shrink-0 text-xs text-gray-400 font-medium pt-0.5">{label}</span>
                <span className="text-sm text-gray-700 break-words">{value}</span>
              </div>
            ))}
            <p className="text-[11px] text-gray-400 mt-4 flex items-center gap-1.5">
              <User className="h-3 w-3" />
              Para modificar tus datos, comunícate con la administración.
            </p>
          </div>
        </Modal>
      )}

      {/* ── Modal: Historial de Pagos ──────────────────────── */}
      {modal === 'historial' && (
        <Modal title="Historial de Pagos" onClose={() => setModal(null)}>
          {pagosPagados.length === 0 ? (
            <p className="text-center text-gray-400 py-8">No hay pagos registrados aún.</p>
          ) : (
            <div className="space-y-2">
              {pagosPagados.map(p => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-gray-100"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        Período {p.periodo.slice(0, 4)}-{p.periodo.slice(4, 6)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {fmtDate(p.fechaPagoRegistrada)}
                        {p.numeroOperacion ? ` · Op. ${p.numeroOperacion}` : ''}
                        {p.metodoPago ? ` · ${p.metodoPago}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-700">{fmt(p.monto)}</p>
                    {p.descuentoProntoPago ? (
                      <p className="text-xs text-emerald-500">
                        Dcto. {fmt(p.descuentoProntoPago)}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {/* ── Modal: Pagar Cuota ─────────────────────────────── */}
      {modal === 'pagar' && (
        <Modal title="Pagar Cuota Actual" onClose={() => setModal(null)}>
          <div className="space-y-5">
            {alDia ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                </div>
                <p className="text-lg font-bold text-gray-800">¡Estás al día!</p>
                <p className="text-gray-400 text-sm text-center">No tienes cuotas pendientes por el momento.</p>
              </div>
            ) : (
              <>
                <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                  <p className="text-sm font-semibold text-red-700 mb-1">Deuda vencida</p>
                  <p className="text-2xl font-bold text-red-700">{fmt(deudaTotal)}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {vencidas.length} cuota{vencidas.length !== 1 ? 's' : ''} vencida{vencidas.length !== 1 ? 's' : ''}
                  </p>
                </div>

                {futuras.length > 0 && (
                  <div className="bg-amber-50 rounded-xl p-3 border border-amber-200">
                    <p className="text-xs font-semibold text-amber-700">
                      + {futuras.length} cuota{futuras.length !== 1 ? 's' : ''} próxima{futuras.length !== 1 ? 's' : ''}: {fmt(futuras.reduce((s, c) => s + Number(c.saldo), 0))}
                    </p>
                  </div>
                )}

                <Separator />

                <div className="space-y-3">
                  <p className="text-sm font-semibold text-gray-700">Instrucciones de pago</p>
                  {[
                    {
                      icon: Building2,
                      title: 'Pago en oficina',
                      desc: 'Acércate a las oficinas de JPUSAP con tu DNI y número de padrón.',
                    },
                    {
                      icon: Phone,
                      title: 'Transferencia bancaria',
                      desc: 'Contacta a la tesorería para obtener los datos de la cuenta bancaria.',
                    },
                    {
                      icon: CreditCard,
                      title: 'Pago en línea (próximamente)',
                      desc: 'Estamos trabajando en habilitar el pago en línea directamente desde el portal.',
                    },
                  ].map(({ icon: Icon, title, desc }) => (
                    <div key={title} className="flex gap-3 p-3 rounded-xl border border-gray-100">
                      <div className="w-9 h-9 rounded-full bg-[#059669]/10 flex items-center justify-center shrink-0">
                        <Icon className="h-4 w-4 text-[#059669]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
