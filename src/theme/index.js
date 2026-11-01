import { colors } from './colors';

export { colors };

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 };

export const radius = { sm: 12, md: 16, lg: 22, xl: 28, pill: 999 };

export const type = {
  display: { fontSize: 34, fontWeight: '700', color: colors.textPrimary },
  title: { fontSize: 30, fontWeight: '700', color: colors.textPrimary },
  heading: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
  subheading: { fontSize: 17, fontWeight: '600', color: colors.textPrimary },
  body: { fontSize: 15, color: colors.textPrimary },
  caption: { fontSize: 13, color: colors.textSecondary },
  label: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },
};
