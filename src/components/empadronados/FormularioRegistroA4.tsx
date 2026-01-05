import React from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export const FormularioRegistroA4: React.FC = () => {
  const descargarFormulario = () => {
    const contenido = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Formulario de Registro - Asociación</title>
  <style>
    @page {
      size: A4;
      margin: 1.5cm;
    }
    
    body {
      font-family: 'Arial', sans-serif;
      margin: 0;
      padding: 20px;
      font-size: 11pt;
      line-height: 1.4;
    }
    
    .header {
      text-align: center;
      border-bottom: 3px solid #2563eb;
      padding-bottom: 15px;
      margin-bottom: 20px;
    }
    
    .header h1 {
      margin: 0 0 5px 0;
      color: #1e40af;
      font-size: 20pt;
      text-transform: uppercase;
    }
    
    .header h2 {
      margin: 0;
      color: #64748b;
      font-size: 14pt;
      font-weight: normal;
    }
    
    .seccion {
      margin-bottom: 20px;
      border: 1px solid #e2e8f0;
      padding: 15px;
      border-radius: 8px;
      background-color: #f8fafc;
    }
    
    .seccion-titulo {
      font-weight: bold;
      font-size: 13pt;
      color: #1e40af;
      margin-bottom: 12px;
      padding-bottom: 5px;
      border-bottom: 2px solid #2563eb;
    }
    
    .campo {
      margin-bottom: 12px;
      display: flex;
      align-items: baseline;
    }
    
    .campo label {
      font-weight: 600;
      display: inline-block;
      width: 180px;
      color: #334155;
    }
    
    .campo .linea {
      flex: 1;
      border-bottom: 1px solid #94a3b8;
      min-height: 20px;
      margin-left: 10px;
    }
    
    .campo-completo {
      margin-bottom: 12px;
    }
    
    .campo-completo label {
      font-weight: 600;
      display: block;
      margin-bottom: 5px;
      color: #334155;
    }
    
    .campo-completo .linea-multiple {
      border-bottom: 1px solid #94a3b8;
      min-height: 20px;
      margin-bottom: 8px;
    }
    
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
    }
    
    .checkbox-group {
      display: flex;
      gap: 20px;
      margin-top: 8px;
    }
    
    .checkbox-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .checkbox {
      width: 16px;
      height: 16px;
      border: 2px solid #64748b;
      display: inline-block;
    }
    
    .footer {
      margin-top: 30px;
      border-top: 2px solid #e2e8f0;
      padding-top: 20px;
    }
    
    .firma-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-top: 40px;
    }
    
    .firma-box {
      text-align: center;
    }
    
    .firma-linea {
      border-top: 2px solid #334155;
      margin-top: 50px;
      padding-top: 8px;
      font-weight: 600;
      color: #334155;
    }
    
    .nota {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 10px;
      margin-top: 15px;
      font-size: 10pt;
      color: #92400e;
    }
    
    @media print {
      body {
        padding: 0;
      }
      
      .seccion {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Formulario de Registro</h1>
    <h2>Padrón de Asociados</h2>
  </div>
  
  <div class="seccion">
    <div class="seccion-titulo">📋 DATOS PERSONALES</div>
    
    <div class="campo">
      <label>N° de Padrón:</label>
      <div class="linea"></div>
    </div>
    
    <div class="campo">
      <label>Nombres:</label>
      <div class="linea"></div>
    </div>
    
    <div class="campo">
      <label>Apellidos:</label>
      <div class="linea"></div>
    </div>
    
    <div class="campo">
      <label>DNI:</label>
      <div class="linea"></div>
    </div>
    
    <div class="campo">
      <label>Fecha de Nacimiento:</label>
      <div class="linea"></div>
    </div>
    
    <div class="campo">
      <label>Género:</label>
      <div class="checkbox-group">
        <div class="checkbox-item">
          <span class="checkbox"></span>
          <span>Masculino</span>
        </div>
        <div class="checkbox-item">
          <span class="checkbox"></span>
          <span>Femenino</span>
        </div>
      </div>
    </div>
  </div>
  
  <div class="seccion">
    <div class="seccion-titulo">📞 CONTACTO</div>
    
    <div class="campo">
      <label>Teléfono 1:</label>
      <div class="linea"></div>
    </div>
    
    <div class="campo">
      <label>Teléfono 2:</label>
      <div class="linea"></div>
    </div>
    
    <div class="campo">
      <label>Email:</label>
      <div class="linea"></div>
    </div>
  </div>
  
  <div class="seccion">
    <div class="seccion-titulo">🏠 DATOS DE LA VIVIENDA</div>
    
    <div class="grid-2">
      <div class="campo">
        <label>Manzana:</label>
        <div class="linea"></div>
      </div>
      
      <div class="campo">
        <label>Lote:</label>
        <div class="linea"></div>
      </div>
    </div>
    
    <div class="campo">
      <label>Etapa:</label>
      <div class="linea"></div>
    </div>
    
    <div class="campo">
      <label>Estado de Vivienda:</label>
      <div class="checkbox-group">
        <div class="checkbox-item">
          <span class="checkbox"></span>
          <span>Construida</span>
        </div>
        <div class="checkbox-item">
          <span class="checkbox"></span>
          <span>En Construcción</span>
        </div>
        <div class="checkbox-item">
          <span class="checkbox"></span>
          <span>Terreno</span>
        </div>
      </div>
    </div>
    
    <div class="campo">
      <label>Vive en el predio:</label>
      <div class="checkbox-group">
        <div class="checkbox-item">
          <span class="checkbox"></span>
          <span>Sí</span>
        </div>
        <div class="checkbox-item">
          <span class="checkbox"></span>
          <span>No</span>
        </div>
      </div>
    </div>
  </div>
  
  <div class="seccion">
    <div class="seccion-titulo">👨‍👩‍👧‍👦 MIEMBROS DE FAMILIA</div>
    
    <div class="campo-completo">
      <label>Miembro 1 - Nombre completo:</label>
      <div class="linea-multiple"></div>
      <label>Parentesco:</label>
      <div class="linea-multiple"></div>
    </div>
    
    <div class="campo-completo">
      <label>Miembro 2 - Nombre completo:</label>
      <div class="linea-multiple"></div>
      <label>Parentesco:</label>
      <div class="linea-multiple"></div>
    </div>
    
    <div class="campo-completo">
      <label>Miembro 3 - Nombre completo:</label>
      <div class="linea-multiple"></div>
      <label>Parentesco:</label>
      <div class="linea-multiple"></div>
    </div>
  </div>
  
  <div class="seccion">
    <div class="seccion-titulo">🚗 VEHÍCULOS</div>
    
    <div class="grid-2">
      <div class="campo">
        <label>Placa 1:</label>
        <div class="linea"></div>
      </div>
      
      <div class="campo">
        <label>Tipo:</label>
        <div class="checkbox-group">
          <div class="checkbox-item">
            <span class="checkbox"></span>
            <span>Auto</span>
          </div>
          <div class="checkbox-item">
            <span class="checkbox"></span>
            <span>Moto</span>
          </div>
        </div>
      </div>
    </div>
    
    <div class="grid-2">
      <div class="campo">
        <label>Placa 2:</label>
        <div class="linea"></div>
      </div>
      
      <div class="campo">
        <label>Tipo:</label>
        <div class="checkbox-group">
          <div class="checkbox-item">
            <span class="checkbox"></span>
            <span>Auto</span>
          </div>
          <div class="checkbox-item">
            <span class="checkbox"></span>
            <span>Moto</span>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <div class="seccion">
    <div class="seccion-titulo">📝 OBSERVACIONES</div>
    
    <div class="campo-completo">
      <div class="linea-multiple"></div>
      <div class="linea-multiple"></div>
      <div class="linea-multiple"></div>
    </div>
  </div>
  
  <div class="nota">
    <strong>⚠️ IMPORTANTE:</strong> Este formulario debe ser llenado con letra clara y legible. 
    Adjuntar copia de DNI y recibo de luz o agua. La información proporcionada será verificada por la administración.
  </div>
  
  <div class="footer">
    <div class="firma-section">
      <div class="firma-box">
        <div class="firma-linea">Firma del Asociado</div>
        <div style="margin-top: 8px; font-size: 10pt; color: #64748b;">DNI: _______________</div>
      </div>
      
      <div class="firma-box">
        <div class="firma-linea">Firma y Sello de Recepción</div>
        <div style="margin-top: 8px; font-size: 10pt; color: #64748b;">Fecha: ___/___/______</div>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();

    // Crear blob y descargar
    const blob = new Blob([contenido], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Formulario-Registro-Asociado.html';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={descargarFormulario}
      className="h-8 md:h-9 text-xs md:text-sm transition-all hover:scale-105"
    >
      <Download className="h-3 w-3 md:h-4 md:w-4 md:mr-2" />
      <span className="hidden sm:inline">Formulario A4</span>
    </Button>
  );
};

