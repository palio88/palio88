export interface PrinterProfile {
  id: string;
  name: string;
  brand: string;
  bed_x: number;
  bed_y: number;
  bed_z: number;
  nozzle_diameter: number;
  min_layer_height: number;
  typical_layer_height: number;
}

export const PRINTER_PROFILES: PrinterProfile[] = [
  {
    id: 'bambu_x1c',
    name: 'X1 Carbon',
    brand: 'Bambu Lab',
    bed_x: 256, bed_y: 256, bed_z: 256,
    nozzle_diameter: 0.4, min_layer_height: 0.05, typical_layer_height: 0.2,
  },
  {
    id: 'bambu_p1s',
    name: 'P1S',
    brand: 'Bambu Lab',
    bed_x: 256, bed_y: 256, bed_z: 256,
    nozzle_diameter: 0.4, min_layer_height: 0.05, typical_layer_height: 0.2,
  },
  {
    id: 'bambu_a1',
    name: 'A1 / A1 Mini',
    brand: 'Bambu Lab',
    bed_x: 256, bed_y: 256, bed_z: 256,
    nozzle_diameter: 0.4, min_layer_height: 0.05, typical_layer_height: 0.2,
  },
  {
    id: 'prusa_mk4',
    name: 'MK4',
    brand: 'Prusa',
    bed_x: 250, bed_y: 210, bed_z: 220,
    nozzle_diameter: 0.4, min_layer_height: 0.05, typical_layer_height: 0.2,
  },
  {
    id: 'prusa_mini',
    name: 'MINI+',
    brand: 'Prusa',
    bed_x: 180, bed_y: 180, bed_z: 180,
    nozzle_diameter: 0.4, min_layer_height: 0.05, typical_layer_height: 0.2,
  },
  {
    id: 'ender_3',
    name: 'Ender 3 / V3',
    brand: 'Creality',
    bed_x: 220, bed_y: 220, bed_z: 250,
    nozzle_diameter: 0.4, min_layer_height: 0.1, typical_layer_height: 0.2,
  },
  {
    id: 'voron_24',
    name: 'Voron 2.4',
    brand: 'Voron Design',
    bed_x: 350, bed_y: 350, bed_z: 350,
    nozzle_diameter: 0.4, min_layer_height: 0.05, typical_layer_height: 0.2,
  },
  {
    id: 'generic_fdm',
    name: 'Generic FDM',
    brand: 'Other',
    bed_x: 220, bed_y: 220, bed_z: 220,
    nozzle_diameter: 0.4, min_layer_height: 0.1, typical_layer_height: 0.2,
  },
];

export function getPrinterById(id: string): PrinterProfile | undefined {
  return PRINTER_PROFILES.find((p) => p.id === id);
}

export function checkFitsOnBed(
  dimX: number, dimY: number, dimZ: number,
  printer: PrinterProfile,
): boolean {
  return (
    (dimX <= printer.bed_x && dimY <= printer.bed_y && dimZ <= printer.bed_z) ||
    (dimY <= printer.bed_x && dimX <= printer.bed_y && dimZ <= printer.bed_z)
  );
}
