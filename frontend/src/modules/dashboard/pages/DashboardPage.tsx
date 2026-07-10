import { Grid, Paper, Typography } from '@mui/material';
const indicators = [ ['Risque moyen national', '—'], ['Zones critiques', '—'], ['Alertes actives', '—'], ['Indice vulnérabilité', '—'] ];
export default function DashboardPage() {
  return <Grid container spacing={2}>{indicators.map(([title,value]) => <Grid item xs={12} md={3} key={title}><Paper sx={{p:2}}><Typography color="text.secondary">{title}</Typography><Typography variant="h4">{value}</Typography></Paper></Grid>)}</Grid>;
}
