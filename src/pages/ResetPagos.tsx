import { useEffect, useState } from 'react';
import { ref, remove, get, update } from 'firebase/database';
import { db } from '@/config/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const BASE_PATH = 'cobranzas_v2';

export default function ResetPagos() {
  const [estado, setEstado] = useState<'inicial' | 'procesando' | 'completado' | 'error'>('inicial');
  const [progreso, setProgreso] = useState<string[]>([]);
  const [estadisticas, setEstadisticas] = useState({
    pagos: 0,
    charges: 0
  });

  const ejecutarReset = async () => {
    setEstado('procesando');
    setProgreso([]);
    
    try {
      // Paso 1: Eliminar pagos
      setProgreso(prev => [...prev, '🔄 Eliminando todos los pagos...']);
      await remove(ref(db, `${BASE_PATH}/pagos`));
      setProgreso(prev => [...prev, '✅ Pagos eliminados']);
      
      // Paso 2: Eliminar índices
      setProgreso(prev => [...prev, '🔄 Eliminando índices de pagos...']);
      await remove(ref(db, `${BASE_PATH}/pagos_index`));
      setProgreso(prev => [...prev, '✅ Índices eliminados']);
      
      // Paso 3: Resetear charges
      setProgreso(prev => [...prev, '🔄 Obteniendo charges...']);
      const chargesSnap = await get(ref(db, `${BASE_PATH}/charges`));
      
      if (chargesSnap.exists()) {
        const charges = chargesSnap.val();
        let count = 0;
        const currentTime = Date.now();
        
        setProgreso(prev => [...prev, '🔄 Reseteando charges a estado inicial...']);
        
        for (const periodo in charges) {
          for (const empId in charges[periodo]) {
            for (const chargeId in charges[periodo][empId]) {
              const charge = charges[periodo][empId][chargeId];
              
              const estaVencido = currentTime > charge.fechaVencimiento;
              
              await update(ref(db, `${BASE_PATH}/charges/${periodo}/${empId}/${chargeId}`), {
                saldo: charge.montoOriginal,
                montoPagado: 0,
                estado: estaVencido ? 'moroso' : 'pendiente',
                esMoroso: estaVencido,
                montoMorosidad: 0
              });
              
              count++;
              
              // Actualizar progreso cada 10 charges
              if (count % 10 === 0) {
                setProgreso(prev => [...prev.slice(0, -1), `🔄 Reseteando charges... (${count} procesados)`]);
              }
            }
          }
        }
        
        setProgreso(prev => [...prev.slice(0, -1), `✅ ${count} charges reseteados`]);
        setEstadisticas({ pagos: 0, charges: count });
      } else {
        setProgreso(prev => [...prev, '⚠️ No hay charges para resetear']);
      }
      
      setProgreso(prev => [...prev, '']);
      setProgreso(prev => [...prev, '🎉 RESET COMPLETADO EXITOSAMENTE']);
      setProgreso(prev => [...prev, '']);
      setProgreso(prev => [...prev, '✅ Todos los empadronados ahora deben todos los meses']);
      setProgreso(prev => [...prev, '✅ La configuración se mantiene intacta']);
      setProgreso(prev => [...prev, '✅ Los demás datos se mantienen intactos']);
      
      setEstado('completado');
      
    } catch (error) {
      console.error('Error durante el reset:', error);
      setProgreso(prev => [...prev, '']);
      setProgreso(prev => [...prev, `❌ Error: ${error}`]);
      setEstado('error');
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">🔄 Reset de Pagos de Cobranzas V2</CardTitle>
          <CardDescription>
            Esta herramienta elimina todos los pagos y resetea los charges a estado inicial
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Advertencia</h3>
            <p className="text-sm text-yellow-700">
              Este proceso:
            </p>
            <ul className="list-disc list-inside text-sm text-yellow-700 ml-4 mt-2 space-y-1">
              <li>Elimina TODOS los pagos</li>
              <li>Elimina TODOS los índices de pagos</li>
              <li>Resetea TODOS los charges (como si nadie hubiera pagado)</li>
            </ul>
            <p className="text-sm text-yellow-700 mt-2">
              <strong>NO elimina:</strong> Configuración, Ingresos/Egresos, Periods ni otros datos.
            </p>
          </div>

          {estado === 'inicial' && (
            <div className="flex justify-center">
              <Button 
                onClick={ejecutarReset}
                size="lg"
                className="bg-red-600 hover:bg-red-700"
              >
                Ejecutar Reset de Pagos
              </Button>
            </div>
          )}

          {estado === 'procesando' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                <span className="font-semibold">Procesando...</span>
              </div>
            </div>
          )}

          {progreso.length > 0 && (
            <div className="bg-gray-50 border rounded-lg p-4 max-h-96 overflow-y-auto">
              <div className="font-mono text-sm space-y-1">
                {progreso.map((linea, index) => (
                  <div key={index} className={linea.startsWith('❌') ? 'text-red-600' : linea.startsWith('✅') ? 'text-green-600' : ''}>
                    {linea}
                  </div>
                ))}
              </div>
            </div>
          )}

          {estado === 'completado' && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-800 mb-2">✅ Reset Completado</h3>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="bg-white rounded p-3">
                    <div className="text-sm text-gray-600">Charges Reseteados</div>
                    <div className="text-2xl font-bold text-green-600">{estadisticas.charges}</div>
                  </div>
                </div>
              </div>

              <div className="flex justify-center gap-4">
                <Button 
                  onClick={() => window.location.href = '/#/cobranzas_v2'}
                  variant="default"
                >
                  Ir a Cobranzas V2
                </Button>
                <Button 
                  onClick={() => {
                    setEstado('inicial');
                    setProgreso([]);
                  }}
                  variant="outline"
                >
                  Ejecutar de Nuevo
                </Button>
              </div>
            </div>
          )}

          {estado === 'error' && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="font-semibold text-red-800 mb-2">❌ Error</h3>
                <p className="text-sm text-red-700">
                  Ocurrió un error durante el reset. Revisa la consola para más detalles.
                </p>
              </div>

              <div className="flex justify-center">
                <Button 
                  onClick={() => {
                    setEstado('inicial');
                    setProgreso([]);
                  }}
                  variant="outline"
                >
                  Intentar de Nuevo
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}






