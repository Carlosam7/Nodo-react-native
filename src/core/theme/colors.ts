/**
 * Paleta de colores y tokens visuales acordados en el Lienzo de Alineación.
 * Adopta la identidad institucional de la Universidad del Norte
 * (Rojo institucional, Blanco, Negro y neutros equilibrados).
 */
export const NodoColors = {
  // Primarios Institucionales Uninorte
  primary: '#C41230',
  primaryDark: '#9A0D25',
  primarySoft: '#E53935',
  primaryMuted: '#FFEBEE',
  primaryLight: '#FFF5F5',

  // Superficie y fondos
  background: '#F8F9FA',
  surface: '#FFFFFF',
  card: '#FFFFFF',

  // Tipografía y contrastes
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  textLight: '#FFFFFF',

  // Bordes y separadores
  border: '#E5E7EB',
  borderFocus: '#C41230',
  chipInactive: '#F3F4F6',
  chipBorder: '#E5E7EB',
  navInactive: '#9CA3AF',

  // Estados de Proyecto
  statusIdea: {
    text: '#1D4ED8',
    background: '#EFF6FF',
    border: '#BFDBFE',
    label: 'Idea',
  },
  statusEnDesarrollo: {
    text: '#047857',
    background: '#ECFDF5',
    border: '#A7F3D0',
    label: 'En desarrollo',
  },
  statusCerrado: {
    text: '#4B5563',
    background: '#F3F4F6',
    border: '#E5E7EB',
    label: 'Cerrado',
  },

  // Estados de Postulación
  applicantPending: {
    text: '#B45309',
    background: '#FEF3C7',
    border: '#FDE68A',
    label: 'Pendiente',
  },
  applicantAccepted: {
    text: '#047857',
    background: '#D1FAE5',
    border: '#A7F3D0',
    label: 'Aceptada',
  },
  applicantRejected: {
    text: '#B91C1C',
    background: '#FEE2E2',
    border: '#FECACA',
    label: 'Rechazada',
  },

  // Gradientes de Proyectos (Fondo de Tarjeta)
  projectGradients: [
    ['#C41230', '#FF6B6B'],
    ['#9A0D25', '#C41230'],
    ['#1E3A8A', '#3B82F6'],
    ['#4338CA', '#818CF8'],
    ['#0F766E', '#14B8A6'],
  ] as const,
};
