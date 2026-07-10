import { Box, Paper, Typography } from '@mui/material';

const indicators = [
  ['Risque moyen national', '—'],
  ['Zones critiques', '—'],
  ['Alertes actives', '—'],
  ['Indice vulnérabilité', '—'],
];

export default function DashboardPage() {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          md: 'repeat(4, 1fr)',
        },
        gap: 2,
      }}
    >
      {indicators.map(([title, value]) => (
        <Paper key={title} sx={{ p: 2 }}>
          <Typography color="text.secondary">{title}</Typography>
          <Typography variant="h4">{value}</Typography>
        </Paper>
      ))}
    </Box>
  );
}
